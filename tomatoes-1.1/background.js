/*

  Constants

*/
var modeindex = 0;
var nextindex = 1;
var timerOptions = {};
var PREFS = loadPrefs(),
BADGE_BACKGROUND_COLORS = {
  work: [192, 0, 0, 255],
  break: [0, 192, 0, 255]
}, RING = new Audio("ring.ogg"),
ringLoaded = false;

loadRingIfNecessary();

function defaultPrefs() {
  return {
    siteList: [
      'facebook.com',
      'youtube.com',
      'twitter.com',
      'tumblr.com',
      'pinterest.com',
      'myspace.com',
      'livejournal.com',
      'digg.com',
      'stumbleupon.com',
      'reddit.com',
      'kongregate.com',
      'newgrounds.com',
      'addictinggames.com',
      'hulu.com'
    ],
    durations: { // in seconds
      work: 25 * 60,
      break: 5 * 60,
      work_2: 25 * 60,
      break_2: 5 * 60,
      work_3: 25 * 60,
      break_3: 5 * 60
    },
    shouldRing: true,
    clickRestarts: false,
    whitelist: false,
    selectedIndex: 0
  }
}

function loadPrefs() {
  if(typeof localStorage['prefs'] !== 'undefined') {
    return updatePrefsFormat(JSON.parse(localStorage['prefs']));
  } else {
    return savePrefs(defaultPrefs());
  }
}

function updatePrefsFormat(prefs) {
  // Sometimes we need to change the format of the PREFS module. When just,
  // say, adding boolean flags with false as the default, there's no
  // compatibility issue. However, in more complicated situations, we need
  // to modify an old PREFS module's structure for compatibility.
  
  if(prefs.hasOwnProperty('domainBlacklist')) {
    // Upon adding the whitelist feature, the domainBlacklist property was
    // renamed to siteList for clarity.
    
    prefs.siteList = prefs.domainBlacklist;
    delete prefs.domainBlacklist;
    savePrefs(prefs);
    console.log("Renamed PREFS.domainBlacklist to PREFS.siteList");
  }
  
  if(!prefs.hasOwnProperty('showNotifications')) {
    // Upon adding the option to disable notifications, added the
    // showNotifications property, which defaults to true.
    prefs.showNotifications = true;
    savePrefs(prefs);
    console.log("Added PREFS.showNotifications");
  }
  
  return prefs;
}

function savePrefs(prefs) {
  localStorage['prefs'] = JSON.stringify(prefs);
  return prefs;
}

function setPrefs(prefs) {
  PREFS = savePrefs(prefs);
  loadRingIfNecessary();
  return prefs;
}

function loadRingIfNecessary() {
  console.log('is ring necessary?');
  if(PREFS.shouldRing && !ringLoaded) {
    console.log('ring is necessary');
    RING.onload = function () {
      console.log('ring loaded');
      ringLoaded = true;
    }
    RING.load();
  }
}

var ICONS = {
  ACTION: {
    CURRENT: {},
    PENDING: {}
  },
  FULL: {},
}, iconTypeS = ['default', 'work', 'break'],
  iconType;
for(var i in iconTypeS) {
  iconType = iconTypeS[i];
  ICONS.ACTION.CURRENT[iconType] = "icons/" + iconType + ".png";
  ICONS.ACTION.PENDING[iconType] = "icons/" + iconType + "_pending.png";
  ICONS.FULL[iconType] = "icons/" + iconType + "_full.png";
}

/*

  Models

*/


function Pomodoro(options) {
  this.mostRecentMode = 'break';
  this.nextMode = 'work';
  this.running = false;
  this.recentmodeindex = 'break';
  this.nextmodeindex = 'work';
  if(options.getMode() == 1){
    this.modes = ['work','break','work_2','break_2','work_3','break_3'];
  }else{
      this.modes = ['work','break'];
  }

  this.onTimerEnd = function (timer) {
    this.running = false;
  }

  this.start = function () {
    if(modeindex >= this.modes.length) {
      modeindex = 0; 
    }
    if(nextindex >= this.modes.length) {
      nextindex = 0; 
    }
    this.mostRecentMode = this.modes[modeindex];
    this.nextMode = this.modes[nextindex];





    for(var key in options.timer) {
      timerOptions[key] = options.timer[key];
    }
    if(this.mostRecentMode == 'work' || this.mostRecentMode == 'work_2' || this.mostRecentMode == 'work_3'){
      timerOptions.type = 'work';
      this.recentmodeindex = 'work';
      this.nextmodeindex = 'break';
    }else{
      timerOptions.type = 'break';
      this.recentmodeindex = 'break';
      this.nextmodeindex = 'work';
    }
    timerOptions.duration = options.getDurations()[this.mostRecentMode];



    this.running = true;
    this.currentTimer = new Pomodoro.Timer(this, timerOptions);
    this.currentTimer.start();
  }
  
  this.restart = function () {
      if(this.currentTimer) {
          this.currentTimer.restart();
      }
  }
}

Pomodoro.Timer = function Timer(pomodoro, options) {
  var tickInterval, timer = this;
  this.pomodoro = pomodoro;
  this.timeRemaining = options.duration;
  this.type = options.type;

  this.start = function () {
    tickInterval = setInterval(tick, 1000);
    options.onStart(timer);
    options.onTick(timer);
  }
  
  this.restart = function() {
      this.timeRemaining = options.duration;
      options.onTick(timer);
  }

  this.timeRemainingString = function () {
    if(this.timeRemaining >= 60) {
      return Math.round(this.timeRemaining / 60) + "m";
    } else {
      return (this.timeRemaining % 60) + "s";
    }
  }

  function tick() {
    timer.timeRemaining--;
    options.onTick(timer);
    if(timer.timeRemaining <= 0) {
      clearInterval(tickInterval);
      pomodoro.onTimerEnd(timer);
      options.onEnd(timer);
    }
  }
}

/*

  Views

*/

// The code gets really cluttered down here. Refactor would be in order,
// but I'm busier with other projects >_<

function locationsMatch(location, listedPattern) {
  return domainsMatch(location.domain, listedPattern.domain) &&
    pathsMatch(location.path, listedPattern.path);
}

function parseLocation(location) {
  var components = location.split('/');
  return {domain: components.shift(), path: components.join('/')};
}

function pathsMatch(test, against) {
  /*
    index.php ~> [null]: pass
    index.php ~> index: pass
    index.php ~> index.php: pass
    index.php ~> index.phpa: fail
    /path/to/location ~> /path/to: pass
    /path/to ~> /path/to: pass
    /path/to/ ~> /path/to/location: fail
  */

  return !against || test.substr(0, against.length) == against;
}

function domainsMatch(test, against) {
  /*
    google.com ~> google.com: case 1, pass
    www.google.com ~> google.com: case 3, pass
    google.com ~> www.google.com: case 2, fail
    google.com ~> yahoo.com: case 3, fail
    yahoo.com ~> google.com: case 2, fail
    bit.ly ~> goo.gl: case 2, fail
    mail.com ~> gmail.com: case 2, fail
    gmail.com ~> mail.com: case 3, fail
  */

  // Case 1: if the two strings match, pass
  if(test === against) {
    return true;
  } else {
    var testFrom = test.length - against.length - 1;

    // Case 2: if the second string is longer than first, or they are the same
    // length and do not match (as indicated by case 1 failing), fail
    if(testFrom < 0) {
      return false;
    } else {
      // Case 3: if and only if the first string is longer than the second and
      // the first string ends with a period followed by the second string,
      // pass
      return test.substr(testFrom) === '.' + against;
    }
  }
}

function isLocationBlocked(location) {
  for(var k in PREFS.siteList) {
    listedPattern = parseLocation(PREFS.siteList[k]);
    if(locationsMatch(location, listedPattern)) {
      // If we're in a whitelist, a matched location is not blocked => false
      // If we're in a blacklist, a matched location is blocked => true
      return !PREFS.whitelist;
    }
  }
  
  // If we're in a whitelist, an unmatched location is blocked => true
  // If we're in a blacklist, an unmatched location is not blocked => false
  return PREFS.whitelist;
}

function executeInTabIfBlocked(action, tab) {
  var file = "content_scripts/" + action + ".js", location;
  location = tab.url.split('://');
  location = parseLocation(location[1]);
  
  if(isLocationBlocked(location)) {
    chrome.tabs.executeScript(tab.id, {file: file});
  }
}

function executeInAllBlockedTabs(action) {
  var windows = chrome.windows.getAll({populate: true}, function (windows) {
    var tabs, tab, domain, listedDomain;
    for(var i in windows) {
      tabs = windows[i].tabs;
      for(var j in tabs) {
        executeInTabIfBlocked(action, tabs[j]);
      }
    }
  });
}

var notification, mainPomodoro = new Pomodoro({
  getDurations: function () { return PREFS.durations },
  getMode: function () { return PREFS.selectedIndex },
  timer: {
    onEnd: function (timer) {
      chrome.browserAction.setIcon({
        path: ICONS.ACTION.PENDING[timer.pomodoro.nextmodeindex]
      });
      chrome.browserAction.setBadgeText({text: ''});
      
      if(PREFS.showNotifications) {
        var nextModeName = chrome.i18n.getMessage(timer.pomodoro.nextmodeindex);
        chrome.notifications.create("", {
          type: "basic",
          title: chrome.i18n.getMessage("timer_end_notification_header"),
          message: chrome.i18n.getMessage("timer_end_notification_body",
                                          nextModeName),
          priority: 2,
          iconUrl: ICONS.FULL[timer.type]
        }, function() {});
      }
      
      if(PREFS.shouldRing) {
        console.log("playing ring", RING);
        RING.play();
      }
    },
    onStart: function (timer) {
      chrome.browserAction.setIcon({
        path: ICONS.ACTION.CURRENT[timer.type]
      });
      chrome.browserAction.setBadgeBackgroundColor({
        color: BADGE_BACKGROUND_COLORS[timer.type]
      });
      if(timer.type == 'work') {
        executeInAllBlockedTabs('block');
      } else {
        executeInAllBlockedTabs('unblock');
      }
      if(notification) notification.cancel();
      var tabViews = chrome.extension.getViews({type: 'tab'}), tab;
      for(var i in tabViews) {
        tab = tabViews[i];
        if(typeof tab.startCallbacks !== 'undefined') {
          tab.startCallbacks[timer.type]();
        }
      }
    },
    onTick: function (timer) {
      chrome.browserAction.setBadgeText({text: timer.timeRemainingString()});
    }
  }
});


chrome.browserAction.onClicked.addListener(function (tab) {
  if(mainPomodoro.running) { 
      if(PREFS.clickRestarts) {
          mainPomodoro.restart();
      }
  } else {
      mainPomodoro.start();
  }
  modeindex++;
  nextindex++;
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if(mainPomodoro.recentmodeindex == 'work') {
    executeInTabIfBlocked('block', tab);
  }
});

chrome.notifications.onClicked.addListener(function (id) {
  // Clicking the notification brings you back to Chrome, in whatever window
  // you were last using.
  chrome.windows.getLastFocused(function (window) {
    chrome.windows.update(window.id, {focused: true});
  });
});