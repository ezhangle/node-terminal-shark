var console=console||{"log":function(){}};

/**

* tty.js
 * Copyright (c) 2012, Christopher Jeffrey (MIT License)
 */

;(function() {

/**
 * Elements
 */

var doc = this.document
  , window = this
  , root
  , body
  , h1;

var initialTitle = doc.title;

/**
 * Shared
 */

var socket
  , windows
  , terms
  , uid;

/**
 * Open
 */

var rax =  document.getElementById("suffix").getAttribute('vax');
rax = rax.slice(1)
console.log 

function open() {
  if (socket) return;

  root = doc.documentElement;
  body = doc.body;
  h1 = doc.getElementsByTagName('h1')[0];

  socket = io.connect(null,{resource:rax+"socket.io"});

  windows = [];
  terms = {};
  uid = 0;

  var open = doc.getElementById('open')
    , lights = doc.getElementById('lights');

  if (open) {
    on(open, 'click', function() {
      new Window;
    });
  }

  if (lights) {
    on(lights, 'click', function() {
      root.className = !root.className
        ? 'dark'
        : '';
    });
  }

  socket.on('connect', function() {
    reset();
    new Window;
  });

  socket.on('data', function(id, data) {
    console.log(data);
    terms[id].write(data);
  });

  socket.on('kill', function(id) {
    if (!terms[id]) return;
    terms[id]._destroy();
  });

  // We would need to poll the os on the serverside
  // anyway. there's really no clean way to do this.
  // This is just easier to do on the
  // clientside, rather than poll on the
  // server, and *then* send it to the client.
  setInterval(function() {
    var i = windows.length;
    while (i--) {
      if (!windows[i].focused) continue;
      windows[i].focused.pollProcessName();
    }
  }, 2 * 1000);

  // Keep windows maximized.
  on(window, 'resize', function(ev) {
    var i = windows.length
      , win;

    while (i--) {
      win = windows[i];
      if (win.minimize) {
        win.minimize();
        win.maximize();
      }
    }
  });
}

function reset() {
  var i = windows.length;
  while (i--) {
    windows[i].destroy();
  }
  windows = [];
  terms = {};
  uid = 0;
}

/**
 * Window
 */

function Window() {
  var self = this;

  var el
    , grip
    , bar
    , button
    , title;

  el = document.createElement('div');
  el.className = 'window';

  grip = document.createElement('div');
  grip.className = 'grip';

  bar = document.createElement('div');
  bar.className = 'bar';

  button = document.createElement('div');
  button.innerHTML = '<i class="icon-plus icon-white">';
  button.title = 'new/close';
  button.className = 'tab';


  button2 = document.createElement('div');
  button2.innerHTML = '<i class="icon-remove icon-white">';
  button2.title = 'new/close';
  button2.className = 'tab';
  button2.style.cssFloat = "right"
  button2.style.styleFloat = "right"

  title = document.createElement('div');
  title.className = 'title';
  title.innerHTML = '';
  el.style.opacity = '0.80';
  this.element = el;
  this.grip = grip;
  this.bar = bar;
  this.button = button;
  this.button2 = button2;
  this.title = title;

  this.tabs = [];
  this.focused = null;

  this.cols = Terminal.geometry[0];
  this.rows = Terminal.geometry[1];

  el.appendChild(grip);
  el.appendChild(bar);
  bar.appendChild(button);
  bar.appendChild(button2);
  bar.appendChild(title);
  body.appendChild(el);

  windows.push(this);

  this.createTab();
  this.focus();
  this.bind();

  var topy=Math.floor(Math.random()*100)+120
  var leftx=Math.floor(Math.random()*400)+100
  el.style.left = leftx+"px"
  el.style.top =topy+"px"
}

Window.prototype.bind = function() {

  document.getElementById("open").removeAttribute("disabled")
  document.getElementById("openx").innerHTML =" Spawn Terminal Window";
  var self = this
    , el = this.element
    , bar = this.bar
    , grip = this.grip
    , button = this.button
    , last = 0;

  on(button, 'click', function(ev) {
    if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) {
      self.destroy();
    } else {
      self.createTab();
    }
    return cancel(ev);
  });
  on(this.button2, 'click', function(ev) {
    self.focused.destroy();
    return cancel(ev);
  });

  on(grip, 'mousedown', function(ev) {
    self.focus();
    self.resizing(ev);
    return cancel(ev);
  });

  on(el, 'mousedown', function(ev) {
    if (ev.target !== el && ev.target !== bar) return;

    self.focus();

    cancel(ev);

    if (new Date - last < 600) {
      return self.maximize();
    }
    last = new Date;

    self.drag(ev);

    return cancel(ev);
  });
};

Window.prototype.focus = function() {
  var parent = this.element.parentNode;
  if (parent) {
    parent.removeChild(this.element);
    parent.appendChild(this.element);
  }
  this.focused.focus();
};

Window.prototype.destroy = function() {
  if (this.destroyed) return;
  this.destroyed = true;

  if (this.minimize) this.minimize();

  splice(windows, this);
  if (windows.length) windows[0].focus();

  this.element.parentNode.removeChild(this.element);

  this.each(function(term) {
    term.destroy();
  });
};

Window.prototype.drag = function(ev) {
  var el = this.element;

  if (this.minimize) return;

  var drag = {
    left: el.offsetLeft,
    top: el.offsetTop,
    pageX: ev.pageX,
    pageY: ev.pageY
  };

  el.style.opacity = '0.60';
  el.style.cursor = 'move';
  root.style.cursor = 'move';

  function move(ev) {
    el.style.left =
      (drag.left + ev.pageX - drag.pageX) + 'px';
    el.style.top =
      (drag.top + ev.pageY - drag.pageY) + 'px';
  }

  function up(ev) {

    el.style.opacity = '0.80';
    el.style.cursor = '';
    root.style.cursor = '';

    off(doc, 'mousemove', move);
    off(doc, 'mouseup', up);

  }

  on(doc, 'mousemove', move);
  on(doc, 'mouseup', up);
};

Window.prototype.resizing = function(ev) {
  var self = this
    , el = this.element
    , term = this.focused;

  if (this.minimize) delete this.minimize;

  var resize = {
    w: el.clientWidth,
    h: el.clientHeight
  };

  el.style.overflow = 'hidden';
  el.style.opacity = '0.70';
  el.style.cursor = 'se-resize';
  root.style.cursor = 'se-resize';
  term.element.style.height = '100%';

  function move(ev) {
    var x, y;
    y = el.offsetHeight - term.element.clientHeight;
    x = ev.pageX - el.offsetLeft;
    y = (ev.pageY - el.offsetTop) - y;
    el.style.width = x + 'px';
    el.style.height = y + 'px';
  }

  function up(ev) {
    var x, y;

    x = el.clientWidth / resize.w;
    y = el.clientHeight / resize.h;
    x = (x * term.cols) | 0;
    y = (y * term.rows) | 0;

    self.resize(x, y);

    el.style.width = '';
    el.style.height = '';

    el.style.overflow = '';
    el.style.opacity = '';
    el.style.cursor = '';
    root.style.cursor = '';
    term.element.style.height = '';

    off(doc, 'mousemove', move);
    off(doc, 'mouseup', up);
  }

  on(doc, 'mousemove', move);
  on(doc, 'mouseup', up);
};

Window.prototype.maximize = function() {
  if (this.minimize) return this.minimize();

  var self = this
    , el = this.element
    , term = this.focused
    , x
    , y;

  var m = {
    cols: term.cols,
    rows: term.rows,
    left: el.offsetLeft,
    top: el.offsetTop,
    root: root.className
  };

  this.minimize = function() {
    delete this.minimize;

    el.style.left = m.left + 'px';
    el.style.top = m.top + 'px';
    el.style.width = '';
    el.style.height = '';
    term.element.style.width = '';
    term.element.style.height = '';
    el.style.boxSizing = '';
    self.grip.style.display = '';
    root.className = m.root;

    self.resize(m.cols, m.rows);
  };

  window.scrollTo(0, 0);

  x = root.clientWidth / term.element.offsetWidth;
  y = root.clientHeight / term.element.offsetHeight;
  x = (x * term.cols) | 0;
  y = (y * term.rows) | 0;

  el.style.left = '0px';
  el.style.top = '0px';
  el.style.width = '100%';
  el.style.height = '100%';
  term.element.style.width = '100%';
  term.element.style.height = '100%';
  el.style.boxSizing = 'border-box';
  this.grip.style.display = 'none';
  root.className = 'maximized';

  this.resize(x, y);
};

Window.prototype.resize = function(cols, rows) {
  this.cols = cols;
  this.rows = rows;
  this.each(function(term) {
    term.resize(cols, rows);
  });
};

Window.prototype.each = function(func) {
  var i = this.tabs.length;
  while (i--) {
    func(this.tabs[i], i);
  }
};

Window.prototype.createTab = function() {
  new Tab(this);
};

Window.prototype.highlight = function() {
  var self = this;
  this.element.style.borderColor = 'orange';
  setTimeout(function() {
    self.element.style.borderColor = '';
  }, 200);
  this.focus();
};

Window.prototype.focusTab = function(next) {
  var tabs = this.tabs
    , i = indexOf(tabs, this.focused)
    , l = tabs.length;

  if (!next) {
    if (tabs[--i]) return tabs[i].focus();
    if (tabs[--l]) return tabs[l].focus();
  } else {
    if (tabs[++i]) return tabs[i].focus();
    if (tabs[0]) return tabs[0].focus();
  }

  return this.focused && this.focused.focus();
};

Window.prototype.nextTab = function() {
  return this.focusTab(true);
};

Window.prototype.previousTab = function() {
  return this.focusTab(false);
};

/**
 * Tab
 */

function Tab(win) {

  var self = this;

  var id = uid++
    , cols = win.cols
    , rows = win.rows;

  // TODO: make this an EventEmitter
  Terminal.call(this, cols, rows);

  var button = document.createElement('div');
  button.className = 'tab';
  button.innerHTML = '<i class="icon-asterisk">';
  win.bar.appendChild(button);

    for (var i =0;i<win.tabs.length; i++){
      win.tabs[i].button.innerHTML = '<i class="icon-asterisk">';
    }
      button.innerHTML = '<i class="icon-asterisk icon-white">';  

  on(button, 'click', function(ev) {
    if (ev.ctrlKey || ev.altKey || ev.metaKey || ev.shiftKey) {
      self.destroy();
    } else {
      self.focus();
      win.tabs
      for (var i =0;i<win.tabs.length; i++){
        win.tabs[i].button.innerHTML = '<i class="icon-asterisk">';
      }
      button.innerHTML = '<i class="icon-asterisk icon-white">';
    }
    return cancel(ev);
  });

  this.id = id;
  this.window = win;
  this.button = button;
  this.element = null;
  this.process = '';
  this.open();

  win.tabs.push(this);
  terms[id] = this;

  socket.emit('create', cols, rows, function(err, data) {
    if (err) return self._destroy();
    self.pty = data.pty;
    self.setProcessName(data.process);
  });
};

inherits(Tab, Terminal);

Tab.prototype.handler = function(data) {
  socket.emit('data', this.id, data);
};

Tab.prototype.handleTitle = function(title) {
  if (!title) return;

  title = sanitize(title);
  this.title = title;

  if (Terminal.focus === this) {
    document.title = title;
    // if (h1) h1.innerHTML = title;
  }

  if (this.window.focused === this) {
    this.window.bar.title = title;
    // this.setProcessName(this.process);
  }
};

Tab.prototype._write = Tab.prototype.write;

Tab.prototype.write = function(data) {
  if (this.window.focused !== this) this.button.style.color = 'red';
  return this._write(data);
};

Tab.prototype._focus = Tab.prototype.focus;

Tab.prototype.focus = function() {
  if (Terminal.focus === this) return;

  var win = this.window;

  // maybe move to Tab.prototype.switch
  if (win.focused !== this) {
    if (win.focused) {
      if (win.focused.element.parentNode) {
        win.focused.element.parentNode.removeChild(win.focused.element);
      }
      win.focused.button.style.fontWeight = '';
    }

    win.element.appendChild(this.element);
    win.focused = this;

    win.title.innerHTML = this.process;
    this.button.style.fontWeight = 'bold';
    this.button.style.color = '';
  }

  this.handleTitle(this.title);

  this._focus();

  win.focus();
};

Tab.prototype._resize = Tab.prototype.resize;

Tab.prototype.resize = function(cols, rows) {
  socket.emit('resize', this.id, cols, rows);
  this._resize(cols, rows);
};

Tab.prototype._destroy = function() {
  if (this.destroyed) return;
  this.destroyed = true;

  var win = this.window;

  this.button.parentNode.removeChild(this.button);
  if (this.element.parentNode) {
    this.element.parentNode.removeChild(this.element);
  }

  delete terms[this.id];
  splice(win.tabs, this);

  if (win.focused === this) {
    win.previousTab();
  }

  if (!win.tabs.length) {
    win.destroy();
  }

  // if (!windows.length) {
  //   document.title = initialTitle;
  //   if (h1) h1.innerHTML = initialTitle;
  // }
};

Tab.prototype.destroy = function() {
  if (this.destroyed) return;
  socket.emit('kill', this.id);
  this._destroy();
};

Tab.prototype._keyDown = Tab.prototype.keyDown;

Tab.prototype.keyDown = function(ev) {
  if (this.pendingKey) {
    this.pendingKey = false;
    return this.specialKeyHandler(ev);
  }

  // ^A for screen-key-like prefix.
  if (Terminal.screenKeys && ev.ctrlKey && ev.keyCode === 65) {
    this.pendingKey = true;
    return cancel(ev);
  }

  // Alt-` to quickly swap between windows.
  if (ev.keyCode === 192
      && ((!isMac && ev.altKey)
      || (isMac && ev.metaKey))) {
    cancel(ev);

    var i = indexOf(windows, this.window) + 1;
    if (windows[i]) return windows[i].highlight();
    if (windows[0]) return windows[0].highlight();

    return this.window.highlight();
  }

  // URXVT Keys for tab navigation and creation.
  // Shift-Left, Shift-Right, Shift-Down
  if (ev.shiftKey && (ev.keyCode >= 37 && ev.keyCode <= 40)) {
    cancel(ev);

    if (ev.keyCode === 37) {
      return this.window.previousTab();
    } else if (ev.keyCode === 39) {
      return this.window.nextTab();
    }

    return this.window.createTab();
  }

  // Pass to terminal key handler.
  return this._keyDown(ev);
};

// tmux/screen-like keys
Tab.prototype.specialKeyHandler = function(ev) {
  var win = this.window
    , key = ev.keyCode;

  switch (key) {
    case 65: // a
      if (ev.ctrlKey) {
        return this._keyDown(ev);
      }
      break;
    case 67: // c
      win.createTab();
      break;
    case 75: // k
      win.focused.destroy();
      break;
    case 87: // w (tmux key)
    case 222: // " - mac (screen key)
    case 192: // " - windows (screen key)
      break;
    default: // 0 - 9
      if (key >= 48 && key <= 57) {
        key -= 48;
        // 1-indexed
        key--;
        if (!~key) key = 9;
        if (win.tabs[key]) {
          win.tabs[key].focus();
        }
      }
      break;
  }

  return cancel(ev);
};

/**
 * Program-specific Features
 */

Tab.prototype._bindMouse = Tab.prototype.bindMouse;
Tab.prototype.bindMouse = function() {
  if (!Terminal.programFeatures) return this._bindMouse();

  var self = this;

  var wheelEvent = 'onmousewheel' in window
    ? 'mousewheel'
    : 'DOMMouseScroll';

  var programs = {
    irssi: true,
    man: true,
    less: true,
    htop: true,
    top: true,
    w3m: true,
    lynx: true
  };

  // Mouse support for Irssi.
  on(self.element, wheelEvent, function(ev) {
    if (self.mouseEvents) return;
    if (!programs[self.process]) return;

    if ((ev.type === 'mousewheel' && ev.wheelDeltaY > 0)
        || (ev.type === 'DOMMouseScroll' && ev.detail < 0)) {
      // page up
      self.keyDown({keyCode: 33});
    } else {
      // page down
      self.keyDown({keyCode: 34});
    }

    return cancel(ev);
  });

  return this._bindMouse();
};

Tab.prototype.pollProcessName = function(func) {
  var self = this;
  socket.emit('process', this.id, function(err, name) {
    if (!err) self.setProcessName(name);
    if (func) func(err, name);
  });
};

Tab.prototype.setProcessName = function(name) {
  name = sanitize(name);
  this.process = name;
  this.button.title = name;
  if (this.window.focused === this) {
    // if (this.title) {
    //   name += ' (' + this.title + ')';
    // }
    this.window.title.innerHTML = name;
  }
};

/**
 * Helpers
 */

function inherits(child, parent) {
  function f() {
    this.constructor = child;
  }
  f.prototype = parent.prototype;
  child.prototype = new f;
}

function indexOf(obj, el) {
  var i = obj.length;
  while (i--) {
    if (obj[i] === el) return i;
  }
  return -1;
}

function splice(obj, el) {
  var i = indexOf(obj, el);
  if (~i) obj.splice(i, 1);
}

function on(el, type, handler, capture) {
  el.addEventListener(type, handler, capture || false);
}

function off(el, type, handler, capture) {
  el.removeEventListener(type, handler, capture || false);
}

function cancel(ev) {
  if (ev.preventDefault) ev.preventDefault();
  ev.returnValue = false;
  if (ev.stopPropagation) ev.stopPropagation();
  ev.cancelBubble = true;
  return false;
}

var isMac = ~navigator.userAgent.indexOf('Mac');

function sanitize(text) {
  if (!text) return '';
  return (text + '').replace(/[&<>]/g, '')
}

/**
 * Load
 */

function load() {
  if (socket) return;
  off(doc, 'load', load);
  off(doc, 'DOMContentLoaded', load);
  open();
}

on(doc, 'load', load);
on(doc, 'DOMContentLoaded', load);
setTimeout(load, 200);

/**
 * Expose
 */

this.tty = {
  Window: Window,
  Tab: Tab,
  Terminal: Terminal
};

}).call(this);

