/*
  Localization
*/

// Localize all elements with a data-i18n="message_name" attribute
var localizedElements = document.querySelectorAll('[data-i18n]'), el, message;
for(var i = 0; i < localizedElements.length; i++) {
  el = localizedElements[i];
  message = chrome.i18n.getMessage(el.getAttribute('data-i18n'));
  
  // Capitalize first letter if element has attribute data-i18n-caps
  if(el.hasAttribute('data-i18n-caps')) {
    message = message.charAt(0).toUpperCase() + message.substr(1);
  }
  
  el.innerHTML = message;
}

/*
  Form interaction
*/

var form = document.getElementById('options-form'),
  siteListEl = document.getElementById('site-list'),
  whitelistEl = document.getElementById('blacklist-or-whitelist'),
  showNotificationsEl = document.getElementById('show-notifications'),
  shouldRingEl = document.getElementById('should-ring'),
  clickRestartsEl = document.getElementById('click-restarts'),
  saveSuccessfulEl = document.getElementById('save-successful'),
  timeFormatErrorEl = document.getElementById('time-format-error'),
  background = chrome.extension.getBackgroundPage(),
    work_scenario = document.getElementById('strict-or-flexible'),
    break_option = document.getElementById('free-or-physical')
  startCallbacks = {}, durationEls = {};
  
durationEls['work'] = document.getElementById('work-duration');
durationEls['break'] = document.getElementById('break-duration');

durationEls['work_2'] = document.getElementById('work-duration-2');
durationEls['break_2'] = document.getElementById('break-duration-2');

durationEls['work_3'] = document.getElementById('work-duration-3');
durationEls['break_3'] = document.getElementById('break-duration-3');
var TIME_REGEX = /^([0-9]+)(:([0-9]{2}))?$/;

form.onsubmit = function () {
  console.log("form submitted");
  
  var durations = {}, duration, durationStr, durationMatch;
  
  for(var key in durationEls) {
    durationStr = durationEls[key].value;
    durationMatch = durationStr.match(TIME_REGEX);
    console.log(key, durationStr, durationMatch, TIME_REGEX);
    if(durationMatch) {
      console.log(durationMatch);
      durations[key] = (60 * parseInt(durationMatch[1], 10));
      
      if(durationMatch[3]) {
        durations[key] += parseInt(durationMatch[3], 10);
      }
    } else {
      timeFormatErrorEl.className = 'show';
      return false;
    } 
  }
  console.log(durations);
  
  
  background.setPrefs({
    siteList:           siteListEl.value.split(/\r?\n/),
    durations:          durations,
    showNotifications:  showNotificationsEl.checked,
    shouldRing:         shouldRingEl.checked,
    clickRestarts:      clickRestartsEl.checked,
    whitelist:          whitelistEl.selectedIndex == 1,
    selectedIndex: work_scenario.selectedIndex,
    breakOption: break_option.selectedIndex

  })
  saveSuccessfulEl.className = 'show';
  return false;
}
break_option.onchange = function selectBreak() {
    console.log("break option changed");
    saveSuccessfulEl.removeAttribute('class');
    timeFormatErrorEl.removeAttribute('class');
    var breakOption = break_option.selectedIndex;

}
work_scenario.onchange = function selectWorking(){
  console.log("working scenario changed");
  saveSuccessfulEl.removeAttribute('class');
  timeFormatErrorEl.removeAttribute('class');
  
  var selectedIndex = work_scenario.selectedIndex;
  
  var workinput2 = document.getElementById("work-duration-2");
  var workinput3 = document.getElementById("work-duration-3");
  var breakinput2 = document.getElementById("break-duration-2");
  var breakinput3 = document.getElementById("break-duration-3");
  if(selectedIndex == 0){
    workinput2.disabled = true;
    breakinput2.disabled = true;
    workinput3.disabled = true;
    breakinput3.disabled = true;
  }
  else if(selectedIndex == 1){
    
    workinput2.disabled = false;
    breakinput2.disabled = false;
    workinput3.disabled = false;
    breakinput3.disabled = false;
  }
}

siteListEl.onfocus = formAltered;
showNotificationsEl.onchange = formAltered;
shouldRingEl.onchange = formAltered;
clickRestartsEl.onchange = formAltered;
whitelistEl.onchange = formAltered;

function formAltered() {
  saveSuccessfulEl.removeAttribute('class');
  timeFormatErrorEl.removeAttribute('class');
}


siteListEl.value = background.PREFS.siteList.join("\n");
showNotificationsEl.checked = background.PREFS.showNotifications;
shouldRingEl.checked = background.PREFS.shouldRing;
clickRestartsEl.checked = background.PREFS.clickRestarts;
whitelistEl.selectedIndex = background.PREFS.whitelist ? 1 : 0;
work_scenario.selectedIndex = background.PREFS.selectedIndex;
break_option.selectedIndex = background.PREFS.breakOption;

var duration, minutes, seconds;
for(var key in durationEls) {
  duration = background.PREFS.durations[key];
  seconds = duration % 60;
  minutes = (duration - seconds) / 60;
  if(seconds >= 10) {
    durationEls[key].value = minutes + ":" + seconds;
  } else if(seconds > 0) {
    durationEls[key].value = minutes + ":0" + seconds;
  } else {
    durationEls[key].value = minutes;
  }
  durationEls[key].onfocus = formAltered;
}

function setInputDisabled(state) {
  siteListEl.disabled = state;
  whitelistEl.disabled = state;
  for(var key in durationEls) {
    durationEls[key].disabled = state;
  }
}



startCallbacks.work = function () {
  document.body.className = 'work';
  setInputDisabled(true);
}

startCallbacks.break = function () {
  document.body.removeAttribute('class');
  setInputDisabled(false);
}

if(background.mainPomodoro.mostRecentMode == 'work') {
  startCallbacks.work();
}
