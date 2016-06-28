// ==UserScript==
// @name         NuclearNode+
// @version      0.0.1
// @description  Tools + Utilities for NuclearNode games, including BombParty
// @author       MrInanimated
// @downloadURL  https://github.com/MrInanimated/nuclearnode-plus/raw/master/dist/nplus.user.js
// @match        http://bombparty.sparklinlabs.com/play/*
// @match        http://popsauce.sparklinlabs.com/play/*
// @match        http://masterofthegrid.sparklinlabs.com/play/*
// @match        http://gemblasters.sparklinlabs.com/play/*
// @resource     styles https://github.com/MrInanimated/nuclearnode-plus/raw/0a5a5943bd52d401d3ba98952c4554a9a7cd5d7f/dist/nplus.css
// @resource     buttons https://github.com/MrInanimated/nuclearnode-plus/raw/master/dist/buttons.png
// @resource     twitch_global http://twitchemotes.com/api_cache/v2/global.json
// @resource     twitch_subscriber http://twitchemotes.com/api_cache/v2/subscriber.json
// @resource     ffz_emotes http://api.frankerfacez.com/v1/set/global
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

// Load styles
GM_addStyle(GM_getResourceText("styles"));

var loadScript = function (src, callback, pageCallback) {
    var script = document.createElement("script");
    script.setAttribute("src", src);
    script.addEventListener("load", function () {
        if (callback)
            callback();

        if (pageCallback) {
            var script = document.createElement("script");
            script.textContent = "(" + pageCallback + ")();";
            document.body.appendChild(script);
        }
    }, false);
    document.body.appendChild(script);
};

var executeScript = function (source) {
    var script = document.createElement("script");
    script.textContent = source;
    document.body.appendChild(script);
    document.body.removeChild(script);
};

var loadJSON = function (resource, resourceName, varName) {
    resource = resource || GM_getResourceText(resourceName);
    if (resource) {
        var script = document.createElement("script");
        script.id = varName;
        script.type = "application/json";
        script.textContent = resource;
        document.body.appendChild(script);
    }
};

var loadStyle = function (resourceName) {
    var style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = resourceName;
    document.head.appendChild(style);
};

// Everything in this function will run in the context of the page
// So define everything that will run on the page inside it!
var main = function () {
console.log("NN+: Starting...");

// Detect old BPOverlay, and don't run if it exists
if (window.hasOwnProperty("BPOverlayHasRun")) {
    channel.appendToChat("Info",
            "NuclearNode+ Error: Detected BombParty Overlay " +
            "running. NuclearNode+ will be disabled to avoid " +
            "conflicts.");
    return;
}

// Detect if this script has run before
if (window.hasOwnProperty("nuclearNodePlus")) {
    // Only run once
    return;
}

window.nuclearNodePlus = true;

window.nPlus = {};

var loaded = false;
var waitingForLoad = [];

var loadCheck = function () {
    return window.$ && window.channel && channel.socket;
};

/**
 * Attaches a callback to be called when the NN+ core has loaded.
 * At the point the callback is executed, it's safe to assume the existence of
 * and attach events to the other nPlus functions and channel.socket.
 *
 * If NN+ has already loaded, the callback is called immediately.
 *
 * @param  {Function} callback Function to be called when NN+ core loads.
 */
nPlus.waitForLoad = function (callback) {
    if (loaded || loadCheck()) {
        callback();
        return;
    }

    waitingForLoad.push(callback);
};

var inner = function () {

// It's either this or a bunch of terrible things to check for everything being
// loaded. This is easier
if (!loadCheck()) {
    setTimeout(inner, 100);
    return;
}

// TODO: use i18n.addResourceBundle to add relevant translation strings
i18n.addResourceBundle("en", "nPlus", {
    "areYouSure": "Are you sure?",
    "userNotHere": "This user is no longer here.",
    "actions": "Actions",
    "ignore": "Ignore",
    "unignore": "Unignore",
    "ignoreListEmpty": "Nobody is currently ignored.",
    "playersTitle": "Players:",

    "unmodded": "no longer a Moderator",

    "moreMessages": "More messages below.",

    "settingsButtonText": "NN+",
    "settingsButtonTitle": "NuclearNode+ Settings",

    "chatSettings": "Chat Settings",
    "chat": {
        "twitchEmotes": {
            "name": "Twitch Emotes",
            "title": "Whether Twitch emotes are displayed or not.",
            "options": {
                "on": "On",
                "off": "Off"
            }
        }
    },
    "notificationSettings": "Notification Settings",
    "notifications": {
        "browser": {
            "name": "Desktop Notifications",
            "title": "Send desktop notifications when you're tabbed out.",
            "options": {
                "on": "On",
                "off": "Off",
            }
        },
        "sound": {
            "name": "Sound Notifications",
            "title": "Play a sound when you receive a notification and are tabbed out.",
            "options": {
                "on": "On",
                "off": "Off",
            }
        },
        "alias": {
            "name": "Aliases",
            "title": "Change the aliases that will trigger a notification.\nEnter a list of aliases separated by semicolons, e.g. MrInanimated;Inanimated;Animé;Inan",
        },
    },

    "userList": "User List",
    "ignoredList": "Ignored Users List",

    "creditsTitle": "Credits",
    "credits": {
        "core": "NN+ Core:",
        "coder": "Coder",
    },
});

// Quick monkey patch to fix the unmod message
var oldT = i18n.t;
i18n.t = function (key) {
    if (key === "nuclearnode:userRoles.") {
        return i18n.t("nPlus:unmodded");
    }
    return oldT.apply(this, arguments);
};

$.extend(window.nPlus, {
    // indicates whether twitch emotes are on or not
    twitchEmotes: true,

    // A set of ignored users
    ignoring: {},

    // Whether browser notifications are on or not
    browserNotifications: true,

    // Whether sound notifications are on or not
    soundNotifications: true,

    // Whether to notify at the end of a game
    endGameNotifications: false,

    // a list of aliases for which notifications trigger
    aliases: [],

    // whether the window is focused or not
    // this affects offscreen notifications
    isHidden: false,
});

var wrappedEvents = {};

// Monkey-patching channel.socket.onevent
var oldOnEvent = channel.socket.onevent;
channel.socket.onevent = function (packet) {
    var that = this;
    var args = packet.data || [];

    var event = args[0];  // Yes I know this could be undefined, it's fine
    var data = Array.prototype.slice.call(args, 1);

    // Call any events scheduled to run before
    if (wrappedEvents[event]) {
        $.each(wrappedEvents[event].beforeEvents, function (i, j) {
            try {
                j.apply(that, data);
            }
            catch (e) {
                // TODO: better error handling here
                console.error(e);
            }
        });
    }

    oldOnEvent.call(this, packet);

    // Call any events scheduled to run after
    if (wrappedEvents[event]) {
        $.each(wrappedEvents[event].afterEvents, function (i, j) {
            try {
                j.apply(that, data);
            }
            catch (e) {
                console.error(e);
            }
        });
    }
};

var wrapSocketEvent = function (event) {
    if (wrappedEvents[event]) {
        return;
    }

    wrappedEvents[event] = {
        beforeEvents: [],
        afterEvents: [],
    };
};

/**
 * Attach a listener a socket event that fires before the handlers registered
 * using channel.socket.on.
 * @param  {string}   event    Name of event to attach to.
 * @param  {Function} callback Handler to be called before socket handlers.
 */
nPlus.beforeSocketEvent = function (event, callback) {
    if (!wrappedEvents[event])
        wrapSocketEvent(event);

    wrappedEvents[event].beforeEvents.push(callback);
};

/**
 * Get the list of handlers attached to fire before the handlers registered
 * using channel.socket.on.
 *
 * It's recommended to not manipulate this list directly.
 * @param  {string} event Name of the event to retrieve handlers for.
 * @return {Array}        List of handlers for that event.
 */
nPlus.beforeListeners = function (event) {
    if (!wrappedEvents[event])
        wrapSocketEvent(event);

    return wrappedEvents[event].beforeEvents;
};

/**
 * Removes a handler from the list of handlers attached to fire before the
 * handlers registered using channel.socket.on.
 *
 * If there are multiple references to the same handler attached to the same
 * event, this function will remove the first occurence.
 * @param  {string}   event    Name of the event to remove a handler from.
 * @param  {Function} callback Handler to remove.
 */
nPlus.removeBeforeListener = function (event, callback) {
    if (wrappedEvents[event]) {
        var index = wrappedEvents[event].beforeEvents.indexOf(callback);
        if (index > -1) {
            wrappedEvents[event].beforeEvents.splice(index, 1);
        }
    }
};

/**
 * Attach a listener a socket event that fires after the handlers registered
 * using channel.socket.on.
 * @param  {string}   event    Name of event to attach to.
 * @param  {Function} callback Handler to be called after socket handlers.
 */
nPlus.afterSocketEvent = function (event, callback) {
    if (!wrappedEvents[event])
        wrapSocketEvent(event);

    wrappedEvents[event].afterEvents.push(callback);
};

/**
 * Get the list of handlers attached to fire after the handlers registered
 * using channel.socket.on.
 *
 * It's recommended to not manipulate this list directly.
 * @param  {string} event Name of the event to retrieve handlers for.
 * @return {Array}        List of handlers for that event.
 */
nPlus.afterListeners = function (event) {
    if (!wrappedEvents[event])
        wrapSocketEvent(event);

    return wrappedEvents[event].afterEvents;
};

/**
 * Removes a handler from the list of handlers attached to fire after the
 * handlers registered using channel.socket.on.
 *
 * If there are multiple references to the same handler attached to the same
 * event, this function will remove the first occurence.
 * @param  {string}   event    Name of the event to remove a handler from.
 * @param  {Function} callback Handler to remove.
 */
nPlus.removeAfterListener = function (event, callback) {
    if (wrappedEvents[event]) {
        var index = wrappedEvents[event].afterEvents.indexOf(callback);
        if (index > -1) {
            wrappedEvents[event].afterEvents.splice(index, 1);
        }
    }
};

// Custom event definitions
var customEvents = {};

/**
 * Fire a custom event, passing the arguments to all handlers registered under
 * this event.
 * @param  {string} event Name of the custom event to fire.
 * @param  {...*}   args  A number of arguments to pass to the handlers.
 */
nPlus.fireEvent = function (event, args) {
    if (customEvents[event]) {
        args = Array.prototype.slice.call(arguments, 1);
        $.each(customEvents[event], function (i, j) {
            j.apply(window, args);
        });
    }
};

/**
 * Register a handler for a custom event.
 * @param  {string}   event    Name of the custom event to register.
 * @param  {Function} callback Handler to register.
 */
nPlus.on = function (event, callback) {
    if (!customEvents[event])
        customEvents[event] = [];
    customEvents[event].push(callback);
};

/**
 * Get a list of all custom event listeners attached to a specific event.
 *
 * It is recommended you do not manipulate this list directly.
 * @param  {string} event Name of the custom event.
 * @return {Array}        List of handlers registered for that event.
 */
nPlus.listeners = function (event) {
    if (!customEvents[event])
        customEvents[event] = [];
    return customEvents[event];
};

/**
 * Removes a handler attached to a specific event.
 *
 * If there are multiple references to the same handler attached to the same
 * event, this function will remove the first occurence.
 * @param  {string}   event    Name of event to remove handler from.
 * @param  {Function} callback Handler to remove.
 */
nPlus.removeListener = function (event, callback) {
    if (customEvents[event]) {
        var index = customEvents[event].indexOf(callback);
        if (index > -1)
            customEvents[event].splice(index, 1);
    }
};

// Monkey-patching various game functions
var originalChatMessage = JST["nuclearnode/chatMessage"];
JST["nuclearnode/chatMessage"] = function (e) {
    // Okay this is a hilariously bad hack
    // I'm going to make an HTML object out of the result of
    // the original function, then I'm going to remove and add stuff
    // to it as an HTML object,
    // and then I'm going to return it as a string
    var $result = $("<div>" + originalChatMessage(e) + "</div>");
    var $content = $result.find(".Content");
    $content.html(transformMessage($content.html()));
    // This is a good line

    return $result.html();
};

var originalChatUser = JST["nuclearnode/chatUser"];
JST["nuclearnode/chatUser"] = function (e) {
    var $result = $("<div>" + originalChatUser(e) + "</div>");

    // Get rid of ban and mod buttons
    $result.find(".Actions").remove();
    // Add the authId as a data atttribute
    $result.find(".User").attr("data-auth-id", e.user.authId);

    return $result.html();
};

nPlus.scrollTolerance = 100;
var originalAppendToChat = channel.appendToChat;
channel.appendToChat = function (classes, message) {
    if (classes === "Info" && message.indexOf('class="User"') === -1) {
        // Call transformMessage here since it won't go through JST
        // as otherwise message will contain HTML
        message = transformMessage(message);
    }

    // Scroll the chat down within a certain tolerance
    var chatLog = $("#ChatLog")[0];
    if (chatLog.scrollTop >
        chatLog.scrollHeight - chatLog.clientHeight - nPlus.scrollTolerance
    ) {
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    originalAppendToChat(classes, message);
};

// Set up notifications
if (Notification && Notification.permission === "default") {
    Notification.requestPermission();
}

// Process twitch emotes

window.twitch = {
    emotes: {},
    templates: {},
    nonalphabetic: {},
    blacklist: {},
};

/**
 * Add a custom emote to the list of emotes to render.
 * @param  {Object} emote
 * @param  {string} emote.code        The text used to produce the emote.
 * @param  {string} emote.src         The URL of the source image of the emote.
 * @param  {string} emote.titlePrefix A prefix to display before the title-text
 *                                    of the emote, to indicate its origin.
 */
nPlus.addCustomEmote = function (emote) {
    var code = emote.code;
    twitch.emotes[code] = {
        src: emote.src,
        titlePrefix: emote.titlePrefix,
        type: "special",
    };

    if (code.search(/\W/) > -1) {
        twitch.nonalphabetic[code] = twitch[code];
    }
};

try {
    var globalEmotes = JSON.parse($("#twitch_global")[0].textContent);
    var subEmotes = JSON.parse($("#twitch_subscriber")[0].textContent);
    var ffzEmotes = JSON.parse($("#ffz_emotes")[0].textContent);
    // TODO: Move this to a resource file somewhere
    var specialEmotes = {
        "D:": {
            src: "//cdn.betterttv.net/emote/55028cd2135896936880fdd7/1x",
            titlePrefix: "(bttv) ",
        },
        "(ditto)": {
            src: "//cdn.betterttv.net/emote/554da1a289d53f2d12781907/1x",
            titlePrefix: "(bttv) "
        },
        "(puke)": {
            src: "//cdn.betterttv.net/emote/550288fe135896936880fdd4/1x",
            titlePrefix: "(bttv) "
        },
        "MikuStare": {
            src: "//cdn.frankerfacez.com/emoticon/72267/1",
            titlePrefix: "(ffz) ",
        },
        "FrankerZed": {
            src: "//cdn.frankerfacez.com/emoticon/43246/1",
            titlePrefix: "(ffz) ",
        },
        "WooperZ": {
            src: "//cdn.frankerfacez.com/emoticon/18150/1",
            titlePrefix: "(ffz) ",
        },
        "KevinSquirtle": {
            src: "//cdn.frankerfacez.com/emoticon/18146/1",
            titlePrefix: "(ffz) ",
        },
        "TopPika": {
            src: "//cdn.frankerfacez.com/emoticon/18149/1",
            titlePrefix: "(ffz) ",
        },
        "FrenchNerd": {
            src: "//cdn.frankerfacez.com/emoticon/83539/1",
            titlePrefix: "(ffz) ",
        },
        "DontBully": {
            src: "//cdn.frankerfacez.com/emoticon/34549/1",
            titlePrefix: "(ffz) ",
        },
    };

    twitch.templates.global = globalEmotes.template;
    twitch.templates.subscriber = subEmotes.template;

    // Handle twitch based emotes
    $.each(globalEmotes.emotes, function (code, emote) {
        if (!emote.image_id) {
            throw "Missing image ID for " + code;
        }
        twitch.emotes[code] = { image_id: emote.image_id, type: "global" };

        if (code.search(/\W/) > -1) {
            twitch.nonalphabetic[code] = twitch.emotes[code];
        }
    });

    $.each(subEmotes.channels, function (channel, channelObj) {
        $.each(channelObj.emotes, function (index, emote) {
            var code = emote.code;
            if (/^([A-Z][a-z]*|[A-Z]+|[a-z]+)$/.test(code)) {
                twitch.blacklist[code] = {
                    image_id: emote.image_id,
                    channel: channel,
                    type: "subscriber"
                };
            }
            else {
                twitch.emotes[code] = {
                    image_id: emote.image_id,
                    channel: channel,
                    type: "subscriber"
                };

                if (code.search(/\W/) > -1) {
                    twitch.nonalphabetic[code] = twitch.emotes[code];
                }
            }
        });
    });

    // Handle FFZ emotes
    $.each(ffzEmotes.sets, function (setName, set) {
        $.each(set.emoticons, function (index, emote) {
            var code = emote.name;

            if (!emote.urls[1]) {
                throw "Missing source url for " + code;
            }

            twitch.emotes[code] = {
                css: emote.css,
                margins: emote.margins,
                src: emote.urls[1],
                type: "ffz",
            };

            if (code.search(/\W/) > -1) {
                twitch.nonalphabetic[code] = twitch.emotes[code];
            }
        });
    });

    // Handle special emotes
    $.each(specialEmotes, function (code, emote) {
        emote.code = code;
        nPlus.addCustomEmote(emote);
    });
}
catch (e) {
    // Emote loading failed
    console.error(e);
    console.error(e.stack);

    originalAppendToChat("Info", "Loading of twitch emotes failed :(");
    nPlus.emoteError = true;
}

var twitchify = function (message) {
    if (!nPlus.twitchEmotes || nPlus.emoteError)
        return message;

    function getEmote(code, emote) {
        if (twitch.emotes[code] || emote) {
            emote = emote || twitch.emotes[code];

            var src;
            var title;
            switch (emote.type) {
                case "ffz":
                    src = emote.src;
                    title = "(ffz) " + code;
                    break;
                case "subscriber":
                    src = twitch.templates.global.small.replace(
                        "{image_id}", emote.image_id);
                    title = emote.channel + " > " + code;
                    break;
                case "global":
                    src = twitch.templates.subscriber.small.replace(
                        "{image_id}", emote.image_id);
                    title = code;
                    break;
                case "special":
                    src = emote.src;
                    title = emote.titlePrefix + code;
                    break;
            }

            var margins = emote.margins;

            return '<img src="' + src + '" alt="' + code +
                '" title="' + title +
                (margins ? '" style="margin:' + margins : "") +
                '" class="emoticon"></img>';
        }
        else {
            return code;
        }
    }

    // Deal with nonalphanumeric emotes first
    var words = message.split(/(<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>| )/);
    for (var i = 0; i < words.length; i++) {
        if (twitch.nonalphabetic[words[i]]) {
            words[i] = getEmote(words[i]);
        }
    }
    message = words.join("");

    words = message.split(/(<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+>|\W)/);
    for (i = 0; i < words.length; i++) {
        words[i] = getEmote(words[i]);
    }

    message = words.join("");

    // Deal with blacklisted emotes
    return message.replace(/\[[^\]]\]/g, function (match) {
        var code = match.substring(1, match.length - 1);
        if (twitch.blacklist[code]) {
            return getEmote(match, twitch.blacklist[code]);
        }
        return match;
    });
};

// Inline custom markdown support
var inline = {
    escape: /^\\([\\`*{}\[\]()#+\-.!_>~])/,
    tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
    strong: /^\*\*([\s\S]+?)\*\*(?!\*)/,
    underline: /^__([\s\S]+?)__(?!_)/,
    del: /^~~(?=\S)([\s\S]*?\S)~~/,
    em: /^\b_((?:__|[\s\S])+?)_\b|^\*(?=\S)((?:\*\*|\s+[^\*\s]|[^\s\*])*?[^\s\*])\*(?!\*)/,
    code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
    br: /^ {2,}\n(?!\s*$)/,
    text: /^[\s\S]+?(?=[\\<!\[_*`~]| {2,}\n|$)/
};

var inlineLex = function (src) {
    var out = "";

    while (src) {
        // escape
        if ((cap = inline.escape.exec(src))) {
            src = src.substring(cap[0].length);
            out += cap[1];
            continue;
        }

        // tag
        if ((cap = inline.tag.exec(src))) {
            // Leave it alone
            src = src.substring(cap[0].length);
            out += cap[0];
            continue;
        }

        // strong
        if ((cap = inline.strong.exec(src))) {
            src = src.substring(cap[0].length);
            out += "<strong>" + inlineLex(cap[2] || cap[1]) + "</strong>";
            continue;
        }

        // underline
        if ((cap = inline.underline.exec(src))) {
            src = src.substring(cap[0].length);
            // Fuck it, just going to use inline styles
            out += "<span style=\"text-decoration: underline\">" +
                inlineLex(cap[2] || cap[1]) + "</span>";
            continue;
        }

        // em
        if ((cap = inline.em.exec(src))) {
            src = src.substring(cap[0].length);
            out += "<em>" + inlineLex(cap[2] || cap[1]) + "</em>";
            continue;
        }

        // del
        if ((cap = inline.del.exec(src))) {
            src = src.substring(cap[0].length);
            out += "<del>" + inlineLex(cap[1]) + "</del>";
            continue;
        }

        // code
        if ((cap = inline.code.exec(src))) {
            src = src.substring(cap[0].length);
            out += "<code>" + inlineLex(cap[2] || cap[1]) + "</code>";
            continue;
        }

        // br
        if ((cap = inline.br.exec(src))) {
            src = src.substring(cap[0].length);
            out += "<br>";
            continue;
        }

        // text
        if ((cap = inline.text.exec(src))) {
            src = src.substring(cap[0].length);
            out += cap[0];
            continue;
        }

        if (src) {
            throw new Error("Infinite loop starting at: " + src);
        }
    }

    return out;
};

var markdown = function (message) {
    try {
        return inlineLex(message);
    }
    catch (e) {
        console.log("An error occured whilst parsing markdown:\n" + e.message);
        return message;
    }
};

var transformMessage = function (message) {
    message = Autolinker.link(message, {
        className: "chat-link",
    });
    message = twitchify(message);
    message = markdown(message);
    return message;
};

// Go through any preexisting messages and apply formatting to them
$("#ChatLog > li").each(function (i, el) {
    if ($(el).hasClass("Info") && $(el).html().indexOf('class="User"') === -1) {
        $(el).html(transformMessage($(el).html()));
    }
    else if ($(el).hasClass("Message")) {
        $content = $(el).find(".Content");
        $content.html(transformMessage($content.html()));
    }
});

// Make the settings tab
// And define settings tab related operations

// Add a new button at the top
$("<button>")
    .attr("data-tab", "NPlusSettings")
    .text(i18n.t("nPlus:settingsButtonText"))
    .attr("title", i18n.t("nPlus:settingsButtonTitle"))
    .click(function () {
        $("#SidebarTabButtons > *").each(function (i, j) {
            if ($(j).attr("data-tab") === "NPlusSettings")
                $(j).addClass("Active");
            else
                $(j).removeClass("Active");
        });
        $("#SidebarTabs > *").each(function (i, j) {
            if (j.id === "NPlusSettingsTab")
                $(j).addClass("Active");
            else
                $(j).removeClass("Active");
        });
    })
    .appendTo($("#SidebarTabButtons"));

// Add the actual tab
var $settingsTab = $("<div>")
    .attr("id", "NPlusSettingsTab")
    .append($("<div>").attr("id", "SettingsEndMarker"))
    .append($("<div>").attr("id", "CreditsEndMarker"))
    .appendTo($("#SidebarTabs"));

var settingsSections = {};

/**
 * Add a new section to the settings tab, to which settings can be appended to.
 * This creates a table with settings element names in the first column and
 * settings elements in the second column.
 * @param {string} id   The ID that will be used to refer to the section. (This
 *                      is not necessarily the same as its ID in the DOM)
 * @param {string} name The displayed title of the section.
 */
nPlus.addSettingsTabSection = function (id, name) {
    if (settingsSections[id]) {
        throw "Error: A settings section with the id " + id + " already exists";
    }

    var $container = $("<div>")
        .attr("id", "NPlus" + id + "Settings")
        .addClass("settings-section");

    var $wrapper = $("<div>")
        .addClass("settings-wrapper")
        .css("display", "none");
    var $table = $("<table>")
        .addClass("settings-table");

    $wrapper.append($table);

    var $h2 = $("<h2>")
        .text(name)
        .addClass("settings-heading")
        .click(function () {
            $wrapper.slideToggle();
        });

    $container.append($h2).append($wrapper);

    $("#SettingsEndMarker")
        .before($container);
    settingsSections[id] = {
        $container: $container,
        $table: $table,
    };
};

/**
 * Add a select element to the settings tab,
 * @param {string}      sectionId The ID of the section to append the select to.
 * @param {string}      id        The ID of the select. This will be used as the
 *                                element ID for the select element.
 * @param {string}      name      The displayed name of the select element.
 * @param {string|null} title     If not null, a (?) will appear next to the
 *                                name of the element which the user can hover
 *                                over for this text.
 * @param {Object}      options   A string-string map of values to the displayed
 *                                text for each object.
 * @param {Function}    callback  The handler called when the "change" event
 *                                fires on the select.
 */
nPlus.addSettingsSelect = function (sectionId, id, name, title, options, callback) {
    if (!settingsSections[sectionId])
        throw "Error: Section id "+ sectionId + " doesn't exist";

    $select = $("<select>")
        .attr("id", id)
        .attr("data-n-plus", "value");

    $.each(options, function (value, text) {
        $select.append(
            $("<option>")
            .text(text)
            .attr("value", value));
    });

    $select.bind("change", callback);

    nPlus.addCustomSettingsElement(sectionId, $select, name, title);
};

/**
 * Add any custom element to the settings tab.
 * @param {string}      sectionId The ID of the section to add this settings
 *                                element to.
 * @param {HTMLElement} element   The element to add. This can be anything
 *                                accepted by $.append.
 * @param {string}      name      The displayed name for the element.
 * @param {string|null} title     If not null, a (?) will appear next to the
 *                                name of the element which the user can hover
 *                                over for this text.
 */
nPlus.addCustomSettingsElement = function (sectionId, element, name, title) {
    if (!settingsSections[sectionId])
        throw "Error: Section id "+ sectionId + " doesn't exist";

    $table = settingsSections[sectionId].$table;

    $tr = $("<tr>");

    name = name || "";

    $table.append($tr);

    $name = $("<td>").text(name);
    if (title) {
        $name.append(
            $("<small>").addClass("help").attr("title", title).text(" (?)")
        );
    }

    $td = $("<td>");

    $tr.append($name).append($td);

    $td.append(element);
};

/**
 * Adds a custom setting header to the settings tab.
 * This is almost the same as nPlus.addSettingsTabSection, except it just adds
 * an empty div element instead of the table. This is useful for things not
 * following the format of the other settings tabs, like the user list.
 * @param {string} id   The ID that will be used to refer to the section. (This
                        is not necessarily the same as its ID in the DOM)
 * @param {string} name The displayed title of the section.
 *
 * @returns {jQuery} A jQuery object which contains the newly created settings
 *                   section.
 */
nPlus.addCustomSettingsHeader = function (id, name) {
    var $container = $("<div>")
        .attr("id", "NPlus" + id + "Section")
        .addClass("settings-section");

    var $wrapper = $("<div>")
        .addClass("settings-wrapper")
        .css("display", "none");

    var $h2 = $("<h2>")
        .text(name)
        .addClass("settings-heading")
        .click(function () {
            $wrapper.slideToggle();
        });

    $container.append($h2).append($wrapper);

    $("#CreditsEndMarker").before($container);

    return $wrapper;
};

// Credits section
var $creditsContainer = $("<div>")
    .attr("id", "NPlusCreditsSection")
    .addClass("settings-section");

var $creditsWrapper = $("<div>")
    .addClass("settings-wrapper")
    .css("display", "none");

var $creditsH2 = $("<h2>")
    .text(i18n.t("nPlus:creditsTitle"))
    .addClass("settings-heading")
    .click(function () {
        $creditsWrapper.slideToggle();
    });

$creditsContainer.append($creditsH2)
    .append($creditsWrapper);
$settingsTab.append($creditsContainer);

$creditsTable = $("<table>")
    .addClass("settings-table")
    .appendTo($creditsWrapper);

/* Header buttons */

/**
 * Add a header button to the header bar.
 * When clicked, this.data.state will either be "true" or "false" when the
 * callback is called.
 * @param  {string}   on       CSS value for the background when button is on.
 * @param  {string}   off      CSS value for the background when button is off.
 * @param  {string}   id       ID of the button.
 * @param  {string}   title    Title-text of the button when hovered over.
 * @param  {string}   init     Initial state of the button.
 * @param  {Function} callback Callback called on click.
 */
nPlus.makeHeaderButton = function (on, off, id, title, init, callback) {
    var $button = $("<button>")
        .addClass("header-button")
        .attr("id", id)
        .attr("title", title);

    var $container = $("<div>")
        .addClass("header-button-container")
        .append($button)
        .insertBefore($("header > *:last-child"));

    $button.click(function (event) {
        if (this.data.state === "true") {
            this.data.state = "false";
            this.style.background = off;
        }
        else {
            this.data.state = "true";
            this.style.background = on;
        }

        callback.apply(this, arguments);
    });

    if (init) {
        $button.attr("data-state", "true");
        $button.css("background", on);
    }
    else {
        $button.attr("data-state", "false");
        $button.css("background", off);
    }
};

/**
 * Add a credits entry to the credits table.
 * @param {string} name    The name of the credits entry, in the first column.
 * @param {string} html    The HTML to go into the second column.
 */
nPlus.addCreditsEntry = function (name, html) {
    $creditsTable
        .append($("<tr>")
            .append($("<td>")
                .text(name))
            .append($("<td>")
                .html(html)));
};

/**
 * Add a header row to the credits table.
 * @param {string} name Text in the header row.
 */
nPlus.addCreditsHeader = function (name) {
    $creditsTable
        .append($("<tr>")
            .append($("<td>")
                .text(name)
                .attr("colspan", 2)));
};

// Function to call on page load, executes all the queued up callbacks.
var onLoad = function () {
    loaded = true;
    $.each(waitingForLoad, function (i, j) {
        j();
    });

    waitingForLoad.length = 0;
};

if (channel.data) {
    // If channel.data already exists, we've already received the channelData
    // event, so execute onLoad() immediately
    onLoad();
}
else {
    // Otherwise, add onLoad to be fired after the channelData event
    nPlus.afterSocketEvent("channelData", onLoad);
}

};
inner();

// Core functionality to do with the script.
var core = function () {
    // Listeners to change the isHidden variable
    $(window).blur(function () {
        nPlus.isHidden = true;
    });
    $(window).focus(function () {
        nPlus.isHidden = false;
    });

    // Context menu
    //
    // helper function to tidy up code for authorisation checks
    var isAuthed = function(authId) {
        var user = channel.data.usersByAuthId[authId];
        return (user &&
            [
                "host",
                "moderator",
                "administrator",
                "hubAdministrator"
            ].indexOf(user.role) > -1);
    };

    var notHere = function (authId) {
        return !channel.data.usersByAuthId[authId];
    };

    var context = function () {
        if (!$.contextMenu) {
            setTimeout(context, 50);
            return;
        }

        $.contextMenu({
            selector: ".User",
            events : {
                show: function (options) {
                    var authId = this[0].dataset.authId;
                    var user = channel.data.usersByAuthId[authId];
                    if (user) {
                        $(".context-menu-user-name")
                            .text(user.displayName);

                        if (user.role === "moderator") {
                            $(".context-menu-mod")
                                .text(i18n.t("nuclearnode:chat.unmod"));
                        }
                        else {
                            $(".context-menu-mod")
                                .text(i18n.t("nuclearnode:chat.mod"));
                        }

                        if (nPlus.ignoring[authId]) {
                            $(".context-menu-ignore")
                                .text(i18n.t("nPlus:unignore"));
                        }
                        else {
                            $(".context-menu-ignore")
                                .text(i18n.t("nPlus:ignore"));
                        }
                    }
                    else {
                        $(".context-menu-user-name")
                            .text(i18n.t("nPlus:userNotHere"));
                    }
                },
            },
            items: {
                name: {
                    name: i18n.t("nPlus:userNotHere"),
                    className: "context-menu-user-name",
                    type: "html",
                },
                "sep1": "----------",
                ban: {
                    name: i18n.t("nuclearnode:chat.ban"),
                    className: "context-menu-ban",
                    callback: function () {
                        var button = $(".context-menu-ban")[0];
                        if (button.dataset.state === "1") {
                            var authId = this[0].dataset.authId;
                            var user = channel.data.usersByAuthId[authId];
                            channel.socket.emit("banUser", {
                                displayName: user.displayName,
                                authId: user.authId,
                            });
                            return true;
                        }
                        else {
                            button.dataset.state = "1";
                            button.dataset.oldText = button.textContent;
                            button.textContent = i18n.t("nPlus:areYouSure");
                            return false;
                        }
                    },
                    disabled: function () {
                        var target = this[0].dataset.authId;
                        return notHere(target) ||
                            (!isAuthed(app.user.authId) ||
                            isAuthed(target));
                    }
                },
                mod: {
                    name: i18n.t("nuclearnode:chat.mod"),
                    className: "context-menu-mod",
                    callback: function () {
                        var button = $(".context-menu-mod")[0];
                        if (button.dataset.state === "1") {
                            var authId = this[0].dataset.authId;
                            var user = channel.data.usersByAuthId[authId];

                            if (user.role !== "moderator") {
                                channel.socket.emit("modUser", {
                                    displayName: user.displayName,
                                    authId: user.authId,
                                });
                            }
                            else {
                                channel.socket.emit("unmodUser", authId);
                            }
                            return true;
                        }
                        else {
                            button.dataset.state = "1";
                            button.dataset.oldText = button.textContent;
                            button.textContent = i18n.t("nPlus:areYouSure");
                            return false;
                        }
                    },
                    disabled: function () {
                        var target = this[0].dataset.authId;
                        var user = channel.data.usersByAuthId[target];
                        if (!user)
                            return true;
                        if (app.user.role === "host" ||
                            app.user.role === "administrator" ||
                            app.user.role === "hubAdministrator") {
                            if (user.role === "" || user.role === "moderator")
                                return false;
                            else
                                return true;
                        }
                        return true;
                    }
                },
                ignore: {
                    name: i18n.t("nPlus:ignore"),
                    className: "context-menu-ignore",
                    callback: function () {
                        var authId = this[0].dataset.authId;
                        if (nPlus.ignoring[authId]) {
                            delete nPlus.ignoring[authId];
                        }
                        else {
                            nPlus.ignoring[this[0].dataset.authId] =
                                channel.data.usersByAuthId[authId].displayName;

                            $(".Author-" + authId.replace(/:/g, "_"))
                                .addClass("ignored");
                        }
                        updateIgnored();
                        return true;
                    },
                    disabled: function () {
                        return notHere(this[0].dataset.authId);
                    }
                }
            }
        });

        $(document.body).on("contextmenu:blur", ".context-menu-item",
            function () {
                $(".context-menu-item").each(function (i, el) {
                    if (el.dataset.state === "1") {
                        el.textContent = el.dataset.oldText;
                        el.dataset.state = "0";
                    }
                });
            }
        );
    };
    context();

    /* Chat scrolls, and throttle handling */
    var throttle = function (f, interval) {
        var executing = false;
        return function () {
            var that = this;
            var args = arguments;
            if (!executing) {
                setTimeout(function () {
                    f.apply(that, args);
                    executing = false;
                }, interval);
                executing = true;
            }
        };
    };

    // Make the more messages alert
    $("#ChatLogPanel").append(
        $("<div>")
            .attr("id", "MoreMessagesAlert")
            .append(
                $("<div>")
                    .attr("id", "MoreMessagesAlertInner")
                    .text(i18n.t("nPlus:moreMessages"))
            )
            .click(function () {
                var chatLog = $("#ChatLog")[0];
                chatLog.scrollTop = chatLog.scrollHeight;
                updateScroll();
            })
    );

    var updateScroll = throttle(function () {
        var chatLog = $("#ChatLog")[0];
        if (chatLog.scrollTop <=
            chatLog.scrollHeight - chatLog.clientHeight - nPlus.scrollTolerance) {
            $("#MoreMessagesAlert").addClass("show");
        }
        else{
            $("#MoreMessagesAlert").removeClass("show");
        }
    }, 100);

    $(window).resize(updateScroll);
    $("#ChatLog").scroll(updateScroll);
    $('#SidebarTabButtons > button[data-tab="Chat"]').click(updateScroll);

    /* Socket event wrapping */
    channel.socket.listeners("chatMessage").pop();
    channel.socket.on("chatMessage", function (e) {
        if (nPlus.ignoring[e.userAuthId])
            return;

        var notified = false;
        if (e.text) {
            // Check if username is mentioned
            var lowercase = e.text.toLowerCase();
            var names = nPlus.aliases.concat(
                    app.user.displayName.toLowerCase());

            $.each(names, function (_, alias) {
                var index = lowercase.indexOf(alias);
                if (index === -1)
                    return true;  // continue

                // Check that the beginning and the end are separators
                var beginning = (index === 0 ||
                        lowercase[index-1].search(/\W/) !== -1);
                var end = (index + alias.length >= lowercase.length ||
                        lowercase[index+alias.length].search(/\W/) !== -1);

                if (beginning && end) {
                    notified = true;
                    return false;  // break
                }
            });

            if (notified && nPlus.isHidden) {
                if (nPlus.soundNotifications) {
                    // TODO: play sound
                }

                if (nPlus.browserNotifications &&
                        Notification && Notification.permission === "granted") {
                    var user = channel.data.usersByAuthId[e.userAuthId];

                    var n = new Notification(user.displayName, {
                        body: e.text,
                        icon: user.pictureURL ||
                            "/images/AvatarPlaceholder.png",
                    });

                    setTimeout(n.close.bind(n), 5000);
                }
            }
        }

        if (e.userAuthId) {
            channel.appendToChat(
                "Message Author-" + e.userAuthId.replace(/:/g, "_") +
                (notified ? " highlighted" : ""),
                JST["nuclearnode/chatMessage"]({
                    text: e.text,
                    author: JST["nuclearnode/chatUser"]({
                        user: channel.data.usersByAuthId[e.userAuthId],
                        i18n: i18n,
                        app: app,
                    }),
                })
            );
        }
        else {
            channel.appendToChat("Info " + (notified ? " highlighted" : ""),
                i18n.t("nuclearnode:chat." + e.text));
        }
    });

    // User list
    var $userWrapper = nPlus.addCustomSettingsHeader("UserList",
        i18n.t("nPlus:userList"));
    $userTable = $("<div>")
        .attr("id", "NPlusUserTable")
        .addClass("user-table");
    $userWrapper.append($userTable);

    var addUser = function (authId) {
        var user = channel.data.usersByAuthId[authId];

        $row = $("<div>")
            .addClass("user-row")
            .addClass("user-list-" + authId.replace(/:/g, "_"));

        $role = $("<div>")
            .addClass("user-role");

        if (user.role !== "") {
            $role.addClass("user-role-" + user.role);
        }

        $user = $("<div>")
            .text(user.displayName)
            .attr("data-auth-id", user.authId)
            .attr("data-display-name", user.displayName)
            .addClass("User");

        $button = $("<button>")
            .text(i18n.t("nPlus:actions"))
            .click(function () {
                $(this.previousSibling).contextmenu();
            });

        $row.append($role)
            .append($user)
            .append($button);

        $userTable.append($row);
    };

    var updateUsers = function (updateRoles) {
        $(".ChannelUsers").attr("title",
            i18n.t("nPlus:playersTitle") + "\n" +
            channel.data.users.map(function (i) {
                return i.displayName;
            }).join("\n"));

        if (updateRoles) {
            $(".user-row").each(function (i, el) {
                var $role = $(el).find(".user-role");
                $role.removeClass(function () {
                    return $(this).attr("class").split(" ")
                    .filter(function (j) {
                        return j.indexOf("user-role-") === 0;
                    }).join(" ");
                });

                var authId = $(el).find(".User").attr("data-auth-id");
                var user = channel.data.usersByAuthId[authId];
                if (user) {
                    if (user.role !== "")
                        $role.addClass("user-role-" + user.role);
                }
            });
        }
    };

    $ignoredWrapper = nPlus.addCustomSettingsHeader("IgnoredList",
        i18n.t("nPlus:ignoredList"));

    $ignoreTable = $("<div>")
        .attr("id", "NPlusIgnoredTable")
        .addClass("user-table")
        .attr("data-n-plus", "data")
        .attr("data-n-plus-data", JSON.stringify(nPlus.ignoring))
        .appendTo($ignoredWrapper);

    $ignoreTable.on("nPlusDataInitial", function () {
        nPlus.ignoring = JSON.parse(this.dataset.nPlusData);
        updateIgnored(true);
    });

    var updateIgnored = function (suppress) {
        $ignoreTable.html("");

        var empty = true;
        $.each(nPlus.ignoring, function (authId, displayName) {
            empty = false;
            $row = $("<div>")
                .addClass("user-row");

            $button = $("<button>")
                .text(i18n.t("nPlus:unignore"))
                .addClass("Unignore")
                .click(function () {
                    if (nPlus.ignoring[authId]) {
                        delete nPlus.ignoring[authId];
                        updateIgnored();
                    }
                });

            $row.append($("<div>").addClass("IgnoredUser").text(displayName))
                .append($button);

            $ignoreTable.append($row);
        });

        if (empty) {
            $ignoreTable.text(i18n.t("nPlus:ignoreListEmpty"));
        }

        $ignoreTable.attr("data-n-plus-data", JSON.stringify(nPlus.ignoring));
        if (!suppress) {
            $ignoreTable[0].dispatchEvent(new Event("nPlusData"));
        }
    };

    nPlus.afterSocketEvent("addUser", function (user) {
        addUser(user.authId);
        updateUsers();
    });

    nPlus.afterSocketEvent("removeUser", function (authId) {
        $(".user-list-" + authId.replace(/:/g, "_")).remove();
        updateUsers();
    });

    nPlus.afterSocketEvent("setUserRole", function () {
        updateUsers(true);
    });

    // Add all the users that are in the room currently
    $.each(channel.data.users, function (i, user) {
        addUser(user.authId);
    });
    updateUsers(true);

    // Set up settings
    nPlus.addSettingsTabSection("Chat",
        i18n.t("nPlus:chatSettings"));
    nPlus.addSettingsSelect(
        "Chat",
        "TwitchEmoteSelect",
        i18n.t("nPlus:chat.twitchEmotes.name"),
        i18n.t("nPlus:chat.twitchEmotes.title"),
        {
            on: i18n.t("nPlus:chat.twitchEmotes.options.on"),
            off: i18n.t("nPlus:chat.twitchEmotes.options.off"),
        },
        function () {
            if (this.value === "on")
                nPlus.twitchEmotes = true;
            else
                nPlus.twitchEmotes = false;
        }
    );

    // Notification settings
    nPlus.addSettingsTabSection("Notifications",
        i18n.t("nPlus:notificationSettings"));
    nPlus.addSettingsSelect(
        "Notifications",
        "BrowserNotificationsSelect",
        i18n.t("nPlus:notifications.browser.name"),
        i18n.t("nPlus:notifications.browser.title"),
        {
            on: i18n.t("nPlus:notifications.browser.options.on"),
            off: i18n.t("nPlus:notifications.browser.options.off"),
        },
        function () {
            if (this.value == "on")
                nPlus.browserNotifications = true;
            else
                nPlus.browserNotifications = false;
        }
    );

    nPlus.addSettingsSelect(
        "Notifications",
        "soundNotificationsSelect",
        i18n.t("nPlus:notifications.sound.name"),
        i18n.t("nPlus:notifications.sound.title"),
        {
            on: i18n.t("nPlus:notifications.sound.options.on"),
            off: i18n.t("nPlus:notifications.sound.options.off"),
        },
        function () {
            if (this.value == "on")
                nPlus.soundNotifications = true;
            else
                nPlus.soundNotifications = false;
        }
    );

    $aliasInput = $("<input>")
        .attr("type", "text")
        .attr("data-n-plus", "value")
        .on("change", function () {
            nPlus.aliases = this.value.split(";")
                .filter(function (i) { return i.length; });
        });

    nPlus.addCustomSettingsElement(
        "Notifications",
        $aliasInput,
        i18n.t("nPlus:notifications.alias.name"),
        i18n.t("nPlus:notifications.alias.title")
    );

    nPlus.addCreditsHeader(i18n.t("nPlus:credits.core"));
    nPlus.addCreditsEntry(i18n.t("nPlus:credits.coder"), "MrInanimated");

    nPlus.resources = JSON.parse($("#nplus-resources")[0].textContent);

    console.log("NN+: Core loaded");
};
nPlus.waitForLoad(core);

var popsauce = function () {
    nPlus.autoFocus = true;

    nPlus.makeHeaderButton(
        "url('" + nPlus.resources.buttons + "') 0 0",
        "url('" + nPlus.resources.buttons + "') -30px 0",
        "auto-focus-button",
        i18n.t("nPlus:autoFocusButton"),
        true,
        function () {
            if (this.data.state === "true") {
                nPlus.autoFocus = true;
            }
            else {
                nPlus.autoFocus = false;
            }
        });

    nPlus.afterSocketEvent("score", function (event) {
        if (nPlus.autoFocus && event.actorId === app.user.authId) {
            setTimeout(function () {
                $("#ChatInputBox").focus();
            }, 400);
        }
    });

    nPlus.afterSocketEvent("roundEnd", function () {
        if (nPlus.autoFocus) {
            setTimeout(function () {
                $("#ChatInputBox").focus();
            }, 400);
        }
    });

    console.log("NN+: Popsauce loaded");
};
nPlus.waitForLoad(popsauce);

};

loadJSON(null, "twitch_global", "twitch_global");
loadJSON(null, "twitch_subscriber", "twitch_subscriber");
loadJSON(null, "ffz_emotes", "ffz_emotes");

loadJSON(JSON.stringify({
    buttons: GM_getResourceURL("buttons")
}), null, "nplus-resources");

loadScript("//ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js",
    function () {
        loadScript("//cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.1.1/jquery.contextMenu.min.js");
        loadStyle("//cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.1.1/jquery.contextMenu.min.css");
    }
);
loadScript("//cdnjs.cloudflare.com/ajax/libs/autolinker/0.24.1/Autolinker.min.js");
executeScript("(" + main + ")();");

// Bind settings elements and save their settings
var bindSettings = function () {
    if (!document.querySelector("#NPlusSettingsTab")) {
        setTimeout(bindSettings, 100);
        return;
    }

    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            for (var i = 0; i < mutation.addedNodes.length; i++) {
                var node = mutation.addedNodes[i];
                if (node.dataset && node.dataset.nPlus)
                    bindSettingsElement(node);
            }
        });
    });

    observer.observe(document.querySelector("#NPlusSettingsTab"), {
        childList: true,
        subtree: true,
    });

    // Bind elements already in the DOM
    var elements = document.querySelectorAll("*[data-n-plus]");
    for (var i = 0; i < elements.length; i++) {
        bindSettingsElement(elements[i]);
    }
};

var bindSettingsElement = function (element) {
    switch (element.dataset.nPlus) {
        case "value":
            element.value = GM_getValue(element.id, element.value);
            element.dispatchEvent(new Event("change"));
            element.addEventListener("change", function () {
                GM_setValue(this.id, this.value);
            });
            break;
        case "data":
            element.dataset.nPlusData = GM_getValue(element.id,
                element.dataset.nPlusData || "");
            element.dispatchEvent(new Event("nPlusDataInitial"));
            element.addEventListener("nPlusData", function() {
                GM_setValue(this.id, this.dataset.nPlusData);
            });
            break;
        default:
            break;
    }
};

bindSettings();
