/*

  Constants

*/
var modeindex = 0;
var nextindex = 1;
var timerOptions = {};
var PREF = loadPref(),
BADGE_BACKGROUND_COLORS = {
  work: [192, 0, 0, 255],
  break: [0, 192, 0, 255]
}, RING = new Audio("ring.ogg"),
ringLoaded = false;

loadRingIfNecessary();

function defaultPref() {
  return {
    siteList: [
        'youtube.com',
        'facebook.com',
        'tumblr.com',
        'twitter.com',
        'pinterest.com',
        'myspace.com',
        'livejournal.com',
        'digg.com',
        'stumbleupon.com',
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
    selectedIndex: 0,
    breakOption: 0

  }
}

function loadPref() {
  if(typeof localStorage['pref'] !== 'undefined') {
    return updatePrefFormat(JSON.parse(localStorage['pref']));
  } else {
    return savePref(defaultPref());
  }
}

function updatePrefFormat(pref) {
  // change the format of the PREF module, because sometimes we need
  // to modify an old PREF module's structure for compatibility.
  
  if(pref.hasOwnProperty('domainBlacklist')) {
    // If add whitelist feature, the domainBlacklist property was
    // renamed to siteList.
    
    pref.siteList = pref.domainBlacklist;
    delete pref.domainBlacklist;
    savePref(pref);
    console.log("Renamed PREF.domainBlacklist to PREF.siteList");
  }
  
  if(!pref.hasOwnProperty('showNotifications')) {
    pref.showNotifications = true;
    savePref(pref);
    console.log("Added PREF.showNotifications");
  }
  
  return pref;
}

function savePref(pref) {
  localStorage['pref'] = JSON.stringify(pref);
  return pref;
}

function setPref(pref) {
  PREF = savePref(pref);
  loadRingIfNecessary();
  return pref;
}

function loadRingIfNecessary() {
  console.log('is ring necessary?');
  if(PREF.shouldRing && !ringLoaded) {
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


function Tomato(options) {
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
    this.currentTimer = new Tomato.Timer(this, timerOptions);
    this.currentTimer.start();
  }
  
  this.restart = function () {
      if(this.currentTimer) {
          this.currentTimer.restart();
      }
  }
}

Tomato.Timer = function Timer(tomato, options) {
  var tickInterval, timer = this;
  this.tomato = tomato;
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
      tomato.onTimerEnd(timer);
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

  return !against || test.substr(0, against.length) == against;
}

function domainsMatch(test, against) {

  // when the two strings match, pass
  if(test === against) {
    return true;
  } else {
    var testFrom = test.length - against.length - 1;

    // when the second string is not first, or the same
    // length and do not match, fail
    if(testFrom < 0) {
      return false;
    } else {
      //if and only if the first string is not the second and
      // the first string ends with a period followed by the second string,
      // pass
      return test.substr(testFrom) === '.' + against;
    }
  }
}

function isLocationBlocked(location) {
  for(var k in PREF.siteList) {
    listedPattern = parseLocation(PREF.siteList[k]);
    if(locationsMatch(location, listedPattern)) {
      return !PREF.whitelist;
    }
  }
  return PREF.whitelist;
}

function executeIfBlocked(action, tab) {
  var file = "content_scripts/" + action + ".js", location;
  location = tab.url.split('://');
  location = parseLocation(location[1]);
  
  if(isLocationBlocked(location)) {
    chrome.tabs.executeScript(tab.id, {file: file});
  }
}

function executeAllBlockedTabs(action) {
  var windows = chrome.windows.getAll({populate: true}, function (windows) {
    var tabs, tab, domain, listedDomain;
    for(var i in windows) {
      tabs = windows[i].tabs;
      for(var j in tabs) {
        executeIfBlocked(action, tabs[j]);
      }
    }
  });
}

var notification, mainTomato = new Tomato({
  getDurations: function () { return PREF.durations },
    getMode: function () { return PREF.selectedIndex },
    getOption: function () { return PREF.breakOption },

  timer: {
    onEnd: function (timer) {
      chrome.browserAction.setIcon({
          path: ICONS.ACTION.PENDING[timer.tomato.nextmodeindex]
      });
      chrome.browserAction.setBadgeText({text: ''});
      
      if(PREF.showNotifications) {
          var nextModeName = chrome.i18n.getMessage(timer.tomato.nextmodeindex);
        chrome.notifications.create("", {
          type: "basic",
          title: chrome.i18n.getMessage("timer_end_notification_header"),
          message: chrome.i18n.getMessage("timer_end_notification_body",
                                          nextModeName),
          priority: 2,
          iconUrl: ICONS.FULL[timer.type]
        }, function() {});
      }
      
      if(PREF.shouldRing) {
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
        executeAllBlockedTabs('block');
      } else {
        executeAllBlockedTabs('unblock');
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
    if (mainTomato.running) {
      if(PREF.clickRestarts) {
          mainTomato.restart();
      }
  } else {
        mainTomato.start();
  }
  modeindex++;
  nextindex++;
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (mainTomato.recentmodeindex == 'work') {
    executeIfBlocked('block', tab);
  }
});

chrome.notifications.onClicked.addListener(function (id) {
  // Click the notification, then you are back to Chrome.
  chrome.windows.getLastFocused(function (window) {
    chrome.windows.update(window.id, {focused: true});
  });
});
