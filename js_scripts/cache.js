/********************************************
 * Scriptable App script
 * Name: Terminal
 * Coding: UTF-8
 * @ Tony Chang
 * Copyright (c) 1994-2021 Tony Chang \
 * https://github.com/tony-aptx4869 \
 * All Rights Reserved.
 ********************************************/

/********************************************
 * Constants and Configurations
 ********************************************/

// NOTE: This script uses the Cache script
// https://github.com/tony-aptx4869/scriptable/blob/main/Cache.scriptable
// Make sure to add the Cache script in \
// Scriptable as well!

// TODO: PLEASE SET THESE VALUES
const NAME = 'TODO';
// Vist this website \
// https://home.openweathermap.org/api_keys
// to get WEATHER_API_KEY (account needed)
const WEATHER_API_KEY = 'TODO';
const WORK_CALENDAR_NAME = 'TODO';
const PERSONAL_CALENDAR_NAME = 'TODO';

// Cache keys and default location
const CACHE_KEY_LAST_UPDATED = 'last_updated';
const CACHE_KEY_LOCATION = 'Beijing';
const DEFAULT_LOCATION = { latitude: 39.908901, longitude: 116.397501 };

// Font name and size
const FONT_NAME = 'Menlo';
const FONT_SIZE = 12;

// Colors
const COLORS = {
  bg0: '#29323C',
  bg1: '#1C1C1C',
  personalCalendar: '#5BD2F0',
  workCalendar: '#9D90FF',
  weather: '#FDFD97',
  location: '#EF0808',
  deviceStats: '#7AE7B9',
  battery: '#2AA876',
  yearProgress: '#F19C65'
};

// Whether or not to use a background \
// image for the widget (if false, use \
// gradient color)
const USE_BACKGROUND_IMAGE = false;

/********************************************
 * Initial Setups
 ********************************************/

/**
 * Convenience function to add days to a Date.
 * 
 * @param {*} days The number of days to add
 */ 
 Date.prototype.addDays = function(days) {
  var date = new Date(this.valueOf());
  date.setDate(date.getDate() + days);
  return date;
};

// Import and setup Cache
const Cache = importModule('Cache');
const cache = new Cache('terminalWidget');

// Fetch data and create widget
const data = await fetchData();
const widget = createWidget(data);

// Set background image of widget, if flag is true
if (USE_BACKGROUND_IMAGE) {
  // Determine if our image exists and when it was saved.
  const files = FileManager.local();
  const path = files.joinPath(files.documentsDirectory(), 'terminal-widget-background');
  const exists = files.fileExists(path);

  // If it exists and we're running in the widget, use photo from cache
  if (exists && config.runsInWidget) {
    widget.backgroundImage = files.readImage(path);

  // If it's missing when running in the widget, use a gradient black/dark-gray background.
  } else if (!exists && config.runsInWidget) {
    const bgColor = new LinearGradient();
    bgColor.colors = [new Color("#29323c"), new Color("#1c1c1c")];
    bgColor.locations = [0.0, 1.0];
    widget.backgroundGradient = bgColor;

  // But if we're running in app, prompt the user for the image.
  } else if (config.runsInApp){
    const img = await Photos.fromLibrary();
    widget.backgroundImage = img;
    files.writeImage(path, img);
  }
}

if (config.runsInApp) {  
  widget.presentMedium();
}

Script.setWidget(widget);
Script.complete();

/********************************************
 * Main Functions (Widget and Data-Fetching)
 ********************************************/

/**
 * Main widget function.
 * 
 * @param {} data The data for the widget to display
 */
function createWidget(data) {
  console.log(`Creating widget with data: ${JSON.stringify(data)}`);

  const widget = new ListWidget();
  const bgColor = new LinearGradient();
  bgColor.colors = [new Color(COLORS.bg0), new Color(COLORS.bg1)];
  bgColor.locations = [0.0, 1.0];
  widget.backgroundGradient = bgColor;
  widget.setPadding(10, 15, 15, 10);

  const stack = widget.addStack();
  stack.layoutVertically();
  stack.spacing = 4;
  stack.size = new Size(320, 0);

  // Line 0 - Last Login
  const timeFormatter = new DateFormatter();
  timeFormatter.locale = "en";
  timeFormatter.dateFormat = "HH:mm, MMM d, y";
  //timeFormatter.useNoDateStyle();
  //timeFormatter.useShortTimeStyle();

  const lastLoginLine = stack.addText(`Last login: ${timeFormatter.string(new Date())} (づ｡◕‿‿◕｡)づ`);
  lastLoginLine.textColor = Color.white();
  lastLoginLine.textOpacity = 0.7;
  lastLoginLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 1 - Input
  const inputLine = stack.addText(`${NAME}@iPhone:~$ showinfo`);
  inputLine.textColor = Color.white();
  inputLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 2 - Next Personal Calendar Event
  const nextPersonalCalendarEventLine = stack.addText(`🏠 | ${getCalendarEventTitle(data.nextPersonalEvent, false)}`);
  nextPersonalCalendarEventLine.textColor = new Color(COLORS.personalCalendar);
  nextPersonalCalendarEventLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 3 - Next Work Calendar Event
  const nextWorkCalendarEventLine = stack.addText(`👨🏻‍💻 | ${getCalendarEventTitle(data.nextWorkEvent, true)}`);
  nextWorkCalendarEventLine.textColor = new Color(COLORS.workCalendar);
  nextWorkCalendarEventLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 4 - Weather
  const weatherLine = stack.addText(`${data.weather.icon} | ${data.weather.temperature}° (${data.weather.high}°/${data.weather.low}°), ${data.weather.description}, feels like ${data.weather.feelsLike}°`);
  weatherLine.textColor = new Color(COLORS.weather);
  weatherLine.font = new Font(FONT_NAME, FONT_SIZE);
  
  // Line 5 - Location
  // const locationLine = stack.addText(`📍 | ${data.weather.location}`);
  const locationLine = stack.addText(`📍 | Beijing, Mainland PRC`);
  locationLine.textColor = new Color(COLORS.location);
  locationLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 6 - Bettery Level
  const batteryLine = stack.addText(`${Device.isCharging() ? '⚡️' : '🔋'} | ${renderBattery()} Bettery`)
  batteryLine.textColor = new Color(COLORS.battery)
  batteryLine.font = new Font(FONT_NAME, FONT_SIZE);

  // Line 7 - Year Progress
  const yearProgressLine = stack.addText(`⏳ | ${renderYearProgress()} Year Left`)
  yearProgressLine.textColor = new Color(COLORS.yearProgress)
  yearProgressLine.font = new Font(FONT_NAME, FONT_SIZE);

  return widget;
}

/**
 * Fetch pieces of data for the widget.
 */
async function fetchData() {
  // Get the weather data
  const weather = await fetchWeather();

  // Get next work/personal calendar events
  const nextWorkEvent = await fetchNextCalendarEvent(WORK_CALENDAR_NAME);
  const nextPersonalEvent = await fetchNextCalendarEvent(PERSONAL_CALENDAR_NAME);

  // Get last data update time (and set)
  const lastUpdated = await getLastUpdated();
  cache.write(CACHE_KEY_LAST_UPDATED, new Date().getTime());

  return {
    weather,
    nextWorkEvent,
    nextPersonalEvent,
    device: {
      battery: Math.round(Device.batteryLevel() * 100),
      brightness: Math.round(Device.screenBrightness() * 100),
    },
    lastUpdated,
  };
}

function renderBattery() {
    const batteryLevel = data.device.battery / 100
    // console.log(`Bettery Level: ${batteryLevel}`);
    const used = '▓'.repeat(Math.floor(batteryLevel * 24))
    const left = '░'.repeat(24 - used.length)
    return `${used}${left} ${Math.floor(batteryLevel * 100)}%`
}

function renderYearProgress() {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1) // Start of this year
    const end = new Date(now.getFullYear() + 1, 0, 1) // End of this year
    const progress = (end - now) / (end - start)
    const used = '░'.repeat(Math.floor((1 - progress) * 24))
    const left = '▓'.repeat(24 - used.length)
    return `${used}${left} ${Math.floor(progress * 100)}%`
}

/********************************************
 * Helper Functions
 ********************************************/

//-------------------------------------
// Weather Helper Functions
//-------------------------------------

/**
 * Fetch the weather data from Open Weather Map
 */
async function fetchWeather() {
  let location = await cache.read(CACHE_KEY_LOCATION);
  if (!location) {
    try {
      Location.setAccuracyToThreeKilometers();
      location = await Location.current();
    } catch(error) {
      location = await cache.read(CACHE_KEY_LOCATION);
    }
  }
  if (!location) {
    location = DEFAULT_LOCATION;
  }
  const url = "https://api.openweathermap.org/data/2.5/onecall?lat=" + location.latitude + "&lon=" + location.longitude + "&exclude=minutely,hourly,alerts&units=imperial&lang=en&appid=" + WEATHER_API_KEY;
  const address = await Location.reverseGeocode(location.latitude, location.longitude);
  const data = await fetchJson(url);

  const cityState = `${address[0].postalAddress.city}, ${address[0].postalAddress.state}`;

  if (!data) {
    return {
      location: cityState,
      icon: '❓',
      description: 'Unknown',
      temperature: '?',
      wind: '?',
      high: '?',
      low: '?',
      feelsLike: '?',
    }
  }

  const currentTime = new Date().getTime() / 1000;
  const isNight = currentTime >= data.current.sunset || currentTime <= data.current.sunrise

  return {
    location: cityState,
    icon: getWeatherEmoji(data.current.weather[0].id, isNight),
    description: data.current.weather[0].main,
    temperature: Math.round((data.current.temp - 32) / 1.8),
    wind: Math.round(data.current.wind_speed),
    high: Math.round((data.daily[0].temp.max - 32) / 1.8),
    low: Math.round((data.daily[0].temp.min - 32) / 1.8),
    feelsLike: Math.round((data.current.feels_like - 32) / 1.8),
  }
}

/**
 * Given a weather code from Open Weather Map, determine the best emoji to show.
 * 
 * @param {*} code Weather code from Open Weather Map
 * @param {*} isNight Is `true` if it is after sunset and before sunrise
 */
function getWeatherEmoji(code, isNight) {
  if (code >= 200 && code < 300 || code == 960 || code == 961) {
    return "⛈"
  } else if ((code >= 300 && code < 600) || code == 701) {
    return "🌧"
  } else if (code >= 600 && code < 700) {
    return "❄️"
  } else if (code == 711) {
    return "🔥" 
  } else if (code == 800) {
    return isNight ? "🌕" : "☀️" 
  } else if (code == 801) {
    return isNight ? "☁️" : "🌤"  
  } else if (code == 802) {
    return isNight ? "☁️" : "⛅️"  
  } else if (code == 803) {
    return isNight ? "☁️" : "🌥" 
  } else if (code == 804) {
    return "☁️"  
  } else if (code == 900 || code == 962 || code == 781) {
    return "🌪" 
  } else if (code >= 700 && code < 800) {
    return "🌫" 
  } else if (code == 903) {
    return "🥶"  
  } else if (code == 904) {
    return "🥵" 
  } else if (code == 905 || code == 957) {
    return "💨" 
  } else if (code == 906 || code == 958 || code == 959) {
    return "🧊" 
  } else {
    return "❓" 
  }
}

//-------------------------------------
// Calendar Helper Functions
//-------------------------------------

/**
 * Fetch the next "accepted" calendar event from the given calendar
 * 
 * @param {*} calendarName The calendar to get events from
 */
async function fetchNextCalendarEvent(calendarName) {
  const calendar = await Calendar.forEventsByTitle(calendarName);
  const events = await CalendarEvent.today([calendar]);
  const tomorrow = await CalendarEvent.tomorrow([calendar]);

  console.log(`Got ${events.length} events for ${calendarName}`);
  console.log(`Got ${tomorrow.length} events for ${calendarName} tomorrow`);

  const upcomingEvents = events
    // .concat(tomorrow)
    .filter(e => (new Date(e.endDate)).getTime() >= (new Date()).getTime())
    // .filter(e => e.attendees && e.attendees.some(a => a.isCurrentUser && a.status === 'accepted'));

  return upcomingEvents ? upcomingEvents[0] : null;
}

/**
 * Given a calendar event, return the display text with title and time.
 * 
 * @param {*} calendarEvent The calendar event
 * @param {*} isWorkEvent Is this a work event?
 */
function getCalendarEventTitle(calendarEvent, isWorkEvent) {
  if (!calendarEvent) {
    return `No upcoming ${isWorkEvent ? 'work ' : ''}events`;
  }

  const timeFormatter = new DateFormatter();
  timeFormatter.locale = 'en';
  timeFormatter.dateFormat = "HH:mm";
  //timeFormatter.useNoDateStyle();
  //timeFormatter.useShortTimeStyle();

  const eventTime = new Date(calendarEvent.startDate);

  return `[${timeFormatter.string(eventTime)}] ${calendarEvent.title}`;
}

//-------------------------------------
// Misc. Helper Functions
//-------------------------------------

/**
 * Make a REST request and return the response
 * 
 * @param {*} url URL to make the request to
 * @param {*} headers Headers for the request
 */
async function fetchJson(url, headers) {
  try {
    console.log(`Fetching url: ${url}`);
    const req = new Request(url);
    req.headers = headers;
    const resp = await req.loadJSON();
    return resp;
  } catch (error) {
    console.error(`Error fetching from url: ${url}, error: ${JSON.stringify(error)}`);
  }
}

/**
 * Get the last updated timestamp from the Cache.
 */
async function getLastUpdated() {
  let cachedLastUpdated = await cache.read(CACHE_KEY_LAST_UPDATED);

  if (!cachedLastUpdated) {
    cachedLastUpdated = new Date().getTime();
    cache.write(CACHE_KEY_LAST_UPDATED, cachedLastUpdated);
  }

  return cachedLastUpdated;
}
