// ==UserScript==
// @name         NuclearNode+
// @version      0.1.5
// @description  Tools + Utilities for NuclearNode games, including BombParty
// @author       MrInanimated
// @downloadURL  https://github.com/MrInanimated/nuclearnode-plus/raw/master/dist/nplus.user.js
// @match        http://bombparty.sparklinlabs.com/play/*
// @match        http://popsauce.sparklinlabs.com/play/*
// @match        http://masterofthegrid.sparklinlabs.com/play/*
// @match        http://gemblasters.sparklinlabs.com/play/*
// @resource     styles https://github.com/MrInanimated/nuclearnode-plus/raw/release-0.1.5/dist/nplus.css
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

var loadJSON = function (resourceName, varName) {
    var resource = GM_getResourceText(resourceName);
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
    return window.$ && $.ui && window.channel && channel.socket;
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

    "autoFocusButton": "Automatically focus the chat box after your turn.",
    "dragonButton": "Detach the scoreboard to a draggable container.",
    "hideDead": "Hide dead players in the scoreboard.",

    "timeText": "Elapsed Time: %{time}",
    "wordCountText": "Word Count: %{words}",

    "flipsText": "Flips",
    "flipsTitle": "How many lives this player has regained.",
    "uflipsText": "U-Flips",
    "uflipsTitle": "How many lives this player has regained already at max lives.",
    "livesLostText": "Deaths",
    "livesLostTitle": "How many lives this player has lost.",
    "alphaText": "Alpha",
    "alphaTitle": "Progress of the player through the alphabet.",
    "wordsText": "Words",
    "wordsTitle": "How many words this player has used.",

    "dummyRow": "There's nothing here yet...",

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
        },
        "muteChat": {
            "name": "Mute Chat",
            "title": "You can choose to blanket mute all of chat or just guest messages.",
            "options": {
                "off": "Off",
                "guests": "Mute all guests",
                "all": "Mute everyone"
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
                "off": "Off"
            }
        },
        "sound": {
            "name": "Sound Notifications",
            "title": "Play a sound when you receive a notification and are tabbed out.",
            "options": {
                "on": "On",
                "off": "Off"
            }
        },
        "volume": {
            "name": "Notification Sound Volume",
            "title": "This overrides the game sound level."
        },
        "alias": {
            "name": "Mentions",
            "title": "Change the phrases that will trigger a notification.\nEnter a list of phrases separated by semicolons, e.g. MrInanimated;Inanimated;Animé;Inan",
        },
        "beforeGame": {
            "name": "Notify before a game starts",
            "title": "Play a sound and/or show a desktop notification when a game's about to start so you don't miss it.",
            "options": {
                "on": "On",
                "off": "Off"
            }
        }
    },
    "extraSettings": "Extras",
    "extra": {
        "hardModes": {
            "name": "Hard Modes",
            "title": "Extra harder modes to restrict what words you can use.",
            "options": {
                "none": "None",
                "reverse": "Reverse",
                "jqv": "JQV",
                "alpha": "Forced Alpha",
                "xz": "XZ",
                "kwxyz": "KWXYZ"
            }
        }
    },
    "alphaFail": "That word didn't begin with {0}!",
    "jqvFail": "That word didn't contain J, Q, nor V!",
    "xzFail": "That word didn't contain X, nor Z!",
    "kwxyzFail": "That word didn't contain K, W, X, Y, nor Z!",

    "scoreboardSettings": "Scoreboard Settings",
    "scoreboard": {
        "containerSize": {
            "name": "Container Size",
            "title": "Limit the size of the container.",
            "options": {
                "compact": "Compact",
                "fitToPlayers": "Fit to players"
            }
        },
        "flipsSetting": {
            "name": "Hide Flips",
            "title": "Hide the flips column on the scoreboard."
        },
        "uflipsSetting": {
            "name": "Hide U-Flips",
            "title": "Hide the u-flips column on the scoreboard."
        },
        "livesLostSetting": {
            "name": "Hide Deaths",
            "title": "Hide the deaths column on the scoreboard."
        },
        "alphaSetting": {
            "name": "Hide Alpha",
            "title": "Hide the alpha column on the scoreboard."
        },
        "wordsSetting": {
            "name": "Hide Words",
            "title": "Hide the words column on the scoreboard."
        },
        "showHide": {
            "show": "Show",
            "hide": "Hide"
        }
    },

    "newGameNotification": "A new game is starting!",
    "newGameStarting": "A game's about to start.",

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
                console.error(e.stack);
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
                console.error(e.stack);
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
        twitch.nonalphabetic[code] = twitch.emotes[code];
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
            src: "//cdn.frankerfacez.com/emoticon/143791/1",
            titlePrefix: "(ffz) ",
        },
        "FrankerZed": {
            src: "//cdn.frankerfacez.com/emoticon/43060/1",
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
            src: "//cdn.frankerfacez.com/emoticon/144330/1",
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
    .append($("<div>").attr("id", "DummyListeners"))
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
 * When clicked, this.dataset.state will either be "true" or "false" when the
 * callback is called.
 * @param  {string}   id       ID of the button.
 * @param  {string}   title    Title-text of the button when hovered over.
 * @param  {string}   init     Initial state of the button.
 * @param  {Function} callback Callback called on click.
 * @return {jQuery} jQuery object of the created button.
 */
nPlus.makeHeaderButton = function (id, title, init, callback) {
    var $button = $("<button>")
        .addClass("header-button")
        .attr("id", id)
        .attr("title", title);

    var $container = $("<div>")
        .addClass("header-button-container")
        .append($button)
        .insertBefore($("header > *:last-child"));

    $button.click(function (event) {
        if (this.dataset.state === "true") {
            this.dataset.state = "false";
        }
        else {
            this.dataset.state = "true";
        }

        callback.apply(this, arguments);
    });

    if (init) {
        $button.attr("data-state", "true");
    }
    else {
        $button.attr("data-state", "false");
    }

    return $button;
};

/**
 * Function for core-specific buttons.
 * Not intended for public use.
 */
nPlus._makeHeaderButton = function (offset, id, settingsId, title, init, callback) {
    var $listener;

    var $button = nPlus.makeHeaderButton(id, title, init, function () {
        if (this.dataset.state === "true") {
            this.style.backgroundPosition = offset + "px 0";
        }
        else {
            this.style.backgroundPosition = (offset - 30) + "px 0";
        }

        callback.apply(this, arguments);

        $listener[0].dataset.nPlusData = this.dataset.state;
        $listener[0].dispatchEvent(new Event("nPlusData"));
    });

    $button
        .addClass("n-plus-core-button")
        .css("background-position", (offset - (init ? 0 : 30)) + "px 0");

    $listener = $("<div>")
        .attr("id", settingsId)
        .attr("data-n-plus", "data")
        .attr("data-n-plus-data", init)
        .on("nPlusDataInitial", function () {
            switch (this.dataset.nPlusData) {
                case "true":
                case "false":
                    if (this.dataset.nPlusData !== $button[0].dataset.state) {
                        $button.click();
                    }
                    break;
            }
        })
        .appendTo($("#DummyListeners"));

    return $button;
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

// Add the refreshContainment method to $.draggable.
// Adapted from http://stackoverflow.com/questions/3277890
(function ($){
  var $window = $(window);

  // We need to know the location of the mouse so that we can use it to
  // refresh the containment at any time.

  $window.data("refreshContainment", {mousePosition: {pageX: 0, pageY: 0}});
  $window.mousemove(function (event) {
    $window.data("refreshContainment", {
      mousePosition: {pageX: event.pageX, pageY: event.pageY}
    });
  });

  // Extend draggable with the proxy pattern.
  var proxied = $.fn.draggable;
  $.fn.draggable = (function (method){
    if (method === "refreshContainment") {
      this.each(function (){
        var inst = $(this).data("uiDraggable");

        // Check if the draggable is already being dragged.
        var isDragging = inst.helper && inst.helper.is(".ui-draggable-dragging");

        // We are going to use the existing _mouseStart method to take care of
        // refreshing the containtment but, since we don't actually intend to
        // emulate a true _mouseStart, we have to avoid any extraneous
        // operations like the drag/drop manager and event triggering.
        // So we save the original member values and replace them with dummies.
        var ddmanager = $.ui.ddmanager;
        $.ui.ddmanager = null;
        var trigger = inst._trigger;
        inst._trigger = function () { return true; };


        var mousePosition = $window.data("refreshContainment").mousePosition;
        var fakeEvent = {
          pageX: mousePosition.pageX, pageY: mousePosition.pageY
        };
        inst._mouseStart(fakeEvent);

        // Return those extraneous members back to the original values.
        inst._trigger = trigger;
        $.ui.ddmanager = ddmanager;

        // Clear the drag, unless it was already being dragged.
        if (!isDragging) {
          inst._clear();
        }
      });
      return this;
    }
    else {
      // Delegate all other calls to the actual draggable implemenation.
      return proxied.apply(this, arguments);
    }
  });
})(jQuery);

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

    nPlus.notificationSound = new Audio("/sounds/myTurn.wav");

    /* Socket event wrapping */
    channel.socket.listeners("chatMessage").pop();
    channel.socket.on("chatMessage", function (e) {
        if (nPlus.ignoring[e.userAuthId])
            return;

        switch (nPlus.muteChat) {
            case "guests":
                if (e.userAuthId.indexOf("guest:") === 0) {
                    return;
                }
                break;
            case "all":
                return;
            default:
                break;
        }

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
                    nPlus.notificationSound.play();
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

    nPlus.addSettingsSelect(
        "Chat",
        "MuteChatSelect",
        i18n.t("nPlus:chat.muteChat.name"),
        i18n.t("nPlus:chat.muteChat.title"),
        {
            off: i18n.t("nPlus:chat.muteChat.options.off"),
            guests: i18n.t("nPlus:chat.muteChat.options.guests"),
            all: i18n.t("nPlus:chat.muteChat.options.all"),
        },
        function () {
            nPlus.muteChat = this.value;
            switch (this.value) {
                case "guests":
                    $("*[class^='Author-guest_'], *[class*=' Author-guest_'")
                        .addClass("ignored");
                    break;
                case "all":
                    $(".Message").remove();
                    break;
                default:
                    break;
            }
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
        "SoundNotificationsSelect",
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

    var $volumeControl = $("<input>")
        .attr("type", "range")
        .attr("id", "VolumeControl")
        .attr("min", 0)
        .attr("max", 100)
        .attr("data-n-plus", "value")
        .val(100)
        .on("change", function (e) {
            nPlus.notificationSound.volume = this.value / 100;
            if (!e.detail || !e.detail.nPlus)
                nPlus.notificationSound.play();
        });

    nPlus.addCustomSettingsElement(
        "Notifications",
        $volumeControl,
        i18n.t("nPlus:notifications.volume.name"),
        i18n.t("nPlus:notifications.volume.title")
    );

    var $aliasInput = $("<input>")
        .attr("type", "text")
        .attr("id", "AliasList")
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

    console.log("NN+: Core loaded");
};
nPlus.waitForLoad(core);

var bombparty = function () {
    if (app.appId !== "BombParty")
        return;

    var alphabet = "abcdefghijklmnopqrstuvwxyz";

    nPlus.autoFocus = true;

    nPlus._makeHeaderButton(
        0,
        "AutoFocusButton",
        "AutoFocusSetting",
        i18n.t("nPlus:autoFocusButton"),
        true,
        function () {
            nPlus.autoFocus = this.dataset.state === "true";
        });

    /* Event hooks */
    nPlus.afterSocketEvent("setState", function (state) {
        switch (state) {
            case "playing":
                nPlus.fireEvent("initGame");
                nPlus.fireEvent("gameStart");
                break;
            case "waitingForPlayers":
                nPlus.fireEvent("waiting");
                break;
            case "starting":
                nPlus.fireEvent("starting");
                break;
        }
    });

    nPlus.afterSocketEvent("setActivePlayerIndex", function (index) {
        nPlus.fireEvent("newTurn", channel.data.actors[index], index);
    });

    // Wrap this in a closure
    (function () {
    // Just keep track of a temporary variable here
    // This is okay because these two functions will be called sequentially
    // on the same person; the handlers can't be invoked between each other
    // because of the nature of javascript
    var flipped;
    var lives;
    nPlus.beforeSocketEvent("winWord", function (event) {
        var actor = channel.data.actorsByAuthId[event.playerAuthId];
        lives = actor.lives;
        var lockedLetters = actor.lockedLetters.slice();
        var lettersLeft = lockedLetters.filter(function (i) {
            return actor.lastWord.toLowerCase().indexOf(i) < 0;
        });
        flipped = lettersLeft.length === 0;
    });

    nPlus.afterSocketEvent("winWord", function (event) {
        var actor = channel.data.actorsByAuthId[event.playerAuthId];
        actor.nPlus.words++;
        channel.data.nPlus.wordCount++;

        var uflipped = false;
        if (flipped) {
            actor.nPlus.flips++;
            if (lives === app.public.maxLives) {
                uflipped = true;
                actor.nPlus.uflips++;
            }
        }

        var alpha = false;
        var cycle = false;
        var requiredLetter = alphabet[actor.nPlus.alpha.progress];
        if (actor.lastWord.toLowerCase()[0] === requiredLetter) {
            alpha = true;
            if (++actor.nPlus.alpha.progress >= alphabet.length) {
                cycle = true;
                actor.nPlus.alpha.progress = 0;
                actor.nPlus.alpha.completed++;
            }
        }

        // The flags are there so the events are fired after the relevant
        // information is updated.
        nPlus.fireEvent("winWord", actor);
        if (flipped) nPlus.fireEvent("flip", actor);
        if (uflipped) nPlus.fireEvent("uflip", actor);
        if (alpha) nPlus.fireEvent("alphaProgress", actor);
        if (cycle) nPlus.fireEvent("alphaComplete", actor);
    });
    })();

    // Another closure!
    (function () {
    var lostLife;
    nPlus.beforeSocketEvent("setPlayerLives", function (event) {
        var actor = channel.data.actorsByAuthId[event.playerAuthId];
        lostLife = event.lives < actor.lives;
    });

    nPlus.afterSocketEvent("setPlayerLives", function (event) {
        var actor = channel.data.actorsByAuthId[event.playerAuthId];
        if (lostLife) {
            actor.nPlus.livesLost++;
            nPlus.fireEvent("lostLife", actor);
        }
    });
    })();

    nPlus.afterSocketEvent("setPlayerState", function (event) {
        var actor = channel.data.actorsByAuthId[event.playerAuthId];
        if (event.state === "dead") {
            nPlus.fireEvent("death", actor);
        }
    });

    nPlus.afterSocketEvent("endGame", function (event) {
        channel.data.nPlus.end = Date.now();
        nPlus.fireEvent("endGame");
    });

    // Game initialization
    var getStatsObject = function () {
        return {
            flips: 0,
            uflips: 0,
            livesLost: 0,
            words: 0,
            alpha: {
                progress: 0,
                completed: 0,
            },
        };
    };

    // Make the scoreboard
    var $dockedContainer = $("<div>")
        .attr("id", "NPlusScoreboardDock")
        .addClass("n-plus-scoreboard-container")
        .insertBefore("#Sidebar > *:first-child");

    var $dragContainer = $("<div>")
        .attr("id", "NPlusDragContainer")
        .addClass("n-plus-scoreboard-container")
        .appendTo("body")
        .draggable({
            containment: "body",
            scroll: false,
            cursor: "move",
            stop: function () {
                var offset = $(this).offset();
                $dragListener[0].dataset.nPlusData = JSON.stringify(offset);
                $dragListener[0].dispatchEvent(new Event("nPlusData"));
            },
        });

    // Listener for saving the position of the drag container
    var $dragListener = $("<div>")
        .attr("id", "DragPositionSetting")
        .attr("data-n-plus", "data")
        .attr("data-n-plus-data", JSON.stringify({left: 100, top: 100}))
        .on("nPlusDataInitial", function () {
            var offset = JSON.parse(this.dataset.nPlusData);
            $dragContainer.offset(offset);
            refreshDragon();
        })
        .appendTo("#DummyListeners");

    var $scoreboard = $(
        '<div id="NPlusScoreboard">' +
            '<h2 id="ScoreboardTime"></h2>' +
            '<h2 id="ScoreboardWords"></h2>' +
            '<hr>' +
            '<div id="ScoreboardTableContainer">' +
                '<table id="ScoreboardTable">' +
                    '<thead>' +
                        '<tr>' +
                            '<td id="ScoreboardButtonContainer"></td>' +
                            '<td class="scoreboard-data scoreboard-flips"></td>' +
                            '<td class="scoreboard-data scoreboard-uflips"></td>' +
                            '<td class="scoreboard-data scoreboard-lives-lost"></td>' +
                            '<td class="scoreboard-data scoreboard-alphas"></td>' +
                            '<td class="scoreboard-data scoreboard-words"></td>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody id="ScoreboardTableBody">' +
                    '</tbody>' +
                '</table>' +
            '</div>' +
        '</div>'
    );

    // Slightly not DRY
    // whatever
    $scoreboard
        .find("#ScoreboardTime")
        .text(i18n.t("nPlus:timeText", {time: "0:00"}));
    $scoreboard
        .find("#ScoreboardWords")
        .text(i18n.t("nPlus:wordCountText", {words: 0}));

    $scoreboard
        .find(".scoreboard-flips")
        .text(i18n.t("nPlus:flipsText"))
        .attr("title", i18n.t("nPlus:flipsTitle"));
    $scoreboard
        .find(".scoreboard-uflips")
        .text(i18n.t("nPlus:uflipsText"))
        .attr("title", i18n.t("nPlus:uflipsTitle"));
    $scoreboard
        .find(".scoreboard-lives-lost")
        .text(i18n.t("nPlus:livesLostText"))
        .attr("title", i18n.t("nPlus:livesLostTitle"));
    $scoreboard
        .find(".scoreboard-alphas")
        .text(i18n.t("nPlus:alphaText"))
        .attr("title", i18n.t("nPlus:alphaTitle"));
    $scoreboard
        .find(".scoreboard-words")
        .text(i18n.t("nPlus:wordsText"))
        .attr("title", i18n.t("nPlus:wordsTitle"));

    $scoreboard
        .find("#ScoreboardButtonContainer")
        .append(
            nPlus._makeHeaderButton(
                -120,
                "ScoreboardHideButton",
                "ScoreboardHideSettings",
                i18n.t("nPlus:hideDead"),
                false,
                function () {
                    if (this.dataset.state === "true")
                        $scoreboard.addClass("hide-dead");
                    else
                        $scoreboard.removeClass("hide-dead");
                    refreshDragon();
                }
            ).detach()
        );

    var $scoreboardTable = $scoreboard.find("#ScoreboardTableBody");

    var makeAlpha = function (alpha) {
        return alpha.completed + "-" + alphabet[alpha.progress].toUpperCase();
    };

    var scoreboardName = function (actor) {
        if (actor.authId.split(":")[0] === "guest") {
            return "G. " + actor.authId.split(":")[1];
        }
        return actor.displayName;
    };

    var refreshDragon = function () {
        $dragContainer
            .css("height", "auto")
            .draggable("refreshContainment");
    };

    var addActorRow = function (actor) {
        var $row = $("<tr>")
            .addClass(actor.authId.replace(":", "_"))
            .append(
                $("<td>")
                    .addClass("scoreboard-name")
                    .text(scoreboardName(actor))
            )
            .append(
                $("<td>")
                    .addClass("scoreboard-flips")
                    .text(actor.nPlus.flips)
            )
            .append(
                $("<td>")
                    .addClass("scoreboard-uflips")
                    .text(actor.nPlus.uflips)
            )
            .append(
                $("<td>")
                    .addClass("scoreboard-lives-lost")
                    .text(actor.nPlus.livesLost)
            )
            .append(
                $("<td>")
                    .addClass("scoreboard-alphas")
                    .text(makeAlpha(actor.nPlus.alpha))
            )
            .append(
                $("<td>")
                    .addClass("scoreboard-words")
                    .text(actor.nPlus.words)
            );

        if (actor.state === "dead")
            $row.addClass("dead");
        if (actor.authId === app.user.authId)
            $row.addClass("self");

        $scoreboardTable.append($row);
        refreshDragon();
    };

    var clearActorRows = function () {
        $scoreboardTable.html("");
        refreshDragon();
    };

    window.addEventListener("resize", function () {
        refreshDragon();
    });

    var updateProp = function (actor, prop) {
        var selector = "." + actor.authId.replace(":", "_") + " .scoreboard-";
        var value;
        switch (prop) {
            case "flips":
                selector += "flips";
                value = actor.nPlus.flips;
                break;
            case "uflips":
                selector += "uflips";
                value = actor.nPlus.uflips;
                break;
            case "livesLost":
                selector += "lives-lost";
                value = actor.nPlus.livesLost;
                break;
            case "alphas":
                selector += "alphas";
                value = makeAlpha(actor.nPlus.alpha);
                break;
            case "words":
                selector += "words";
                value = actor.nPlus.words;
                break;
            default:
                return;
        }
        $(selector).text(value);
    };

    nPlus._makeHeaderButton(
        -60,
        "DragonButton",
        "DragonSetting",
        i18n.t("nPlus:dragonButton"),
        false,
        function () {
            var appendTo = (this.dataset.state === "true" ?
                $dragContainer : $dockedContainer);
            $scoreboard.detach().appendTo(appendTo);
            refreshDragon();
        });
    $scoreboard.appendTo($dockedContainer);

    var makeTime = function (time) {
        var seconds = Math.round(time / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);
        minutes %= 60;
        seconds %= 60;

        var result = "";
        if (hours) {
            result += hours + ":";
        }

        if (minutes < 10 && hours) {
            result += "0";
        }
        result += minutes + ":";

        if (seconds < 10) {
            result += "0";
        }
        result += seconds;

        return result;
    };

    var updateTime = function () {
        var time = makeTime(Date.now() - channel.data.nPlus.start);
        $scoreboard
            .find("#ScoreboardTime")
            .text(i18n.t("nPlus:timeText", {time: time}));
    };

    var timerInterval;

    // Initialize
    nPlus.on("initGame", function () {
        clearActorRows();

        for (var i = 0; i < channel.data.actors.length; i++) {
            var actor = channel.data.actors[i];
            actor.nPlus = getStatsObject();
            addActorRow(actor);
        }

        channel.data.nPlus = {
            start: Date.now(),
            wordCount: 0,
        };

        $scoreboard
            .find("#ScoreboardTime")
            .text(i18n.t("nPlus:timeText", {time: "0:00"}));
        $scoreboard
            .find("#ScoreboardWords")
            .text(i18n.t("nPlus:wordCountText", {words: 0}));

        // Just in case
        clearInterval(timerInterval);
        timerInterval = setInterval(updateTime, 1000);
    });

    nPlus.on("flip", function (actor) {
        updateProp(actor, "flips");
    });

    nPlus.on("uflip", function (actor) {
        updateProp(actor, "uflips");
    });

    nPlus.on("lostLife", function (actor) {
        updateProp(actor, "livesLost");
    });

    nPlus.on("alphaProgress", function (actor) {
        updateProp(actor, "alphas");
    });

    nPlus.on("winWord", function (actor) {
        updateProp(actor, "words");
        $scoreboard
            .find("#ScoreboardWords")
            .text(i18n.t("nPlus:wordCountText", {
                words: channel.data.nPlus.wordCount
            }));
    });

    nPlus.on("death", function (actor) {
        $("." + actor.authId.replace(":", "_"))
            .addClass("dead");
    });

    nPlus.on("endGame", function () {
        clearInterval(timerInterval);
        updateTime();
    });

    // Notification before game starts
    nPlus.on("starting", function () {
        if (nPlus.notifyBeforeGame && nPlus.isHidden &&
            !channel.data.actorsByAuthId[app.user.authId]) {
            if (nPlus.soundNotifications)
                nPlus.notificationSound.play();
            if (nPlus.browserNotifications && Notification &&
                Notification.permission === "granted") {
                var n = new Notification(i18n.t("nPlus:newGameNotification"), {
                    body: i18n.t("nPlus:newGameStarting"),
                    icon: "/images/Bomb.png",
                });

                setTimeout(n.close.bind(n), 5000);
            }

        }
    });

    // Auto-focus
    // Flag for saying if the previous turn was the player's
    var focusNext = false;

    // shortcut function
    var setFocus = function () {
        setTimeout(function () {
            var actor = channel.data.actors[channel.data.activePlayerIndex];
            if (actor.authId !== app.user.authId)
                $("#ChatInputBox").focus();
        }, 400);
        focusNext = false;
    };

    nPlus.on("newTurn", function (actor, index) {
        if (channel.data.actors.length > 1 && nPlus.autoFocus) {
            if (focusNext)
                setFocus();
            else if (actor.authId === app.user.authId)
                focusNext = true;
        }
    });

    nPlus.on("endGame", function () {
        if (nPlus.autoFocus && focusNext) {
            setFocus();
        }
    });

    nPlus.addSettingsTabSection(
        "Scoreboard", i18n.t("nPlus:scoreboardSettings"));

    nPlus.addSettingsSelect(
        "Scoreboard",
        "ContainerSetting",
        i18n.t("nPlus:scoreboard.containerSize.name"),
        i18n.t("nPlus:scoreboard.containerSize.title"),
        {
            fitToPlayers: i18n.t("nPlus:scoreboard.containerSize.options.fitToPlayers"),
            compact: i18n.t("nPlus:scoreboard.containerSize.options.compact"),
        },
        function () {
            if (this.value === "compact")
                $scoreboard.addClass("fixed-height");
            else
                $scoreboard.removeClass("fixed-height");

            refreshDragon();
        });

    var scoreboardOptions = [
        {
            id: "FlipsSetting",
            name: i18n.t("nPlus:scoreboard.flipsSetting.name"),
            title: i18n.t("nPlus:scoreboard.flipsSetting.title"),
            class: "hide-flips",
        },
        {
            id: "UFlipsSetting",
            name: i18n.t("nPlus:scoreboard.uflipsSetting.name"),
            title: i18n.t("nPlus:scoreboard.uflipsSetting.title"),
            class: "hide-uflips",
        },
        {
            id: "LivesLostSetting",
            name: i18n.t("nPlus:scoreboard.livesLostSetting.name"),
            title: i18n.t("nPlus:scoreboard.livesLostSetting.title"),
            class: "hide-lives-lost",
        },
        {
            id: "AlphaSetting",
            name: i18n.t("nPlus:scoreboard.alphaSetting.name"),
            title: i18n.t("nPlus:scoreboard.alphaSetting.title"),
            class: "hide-alphas",
        },
        {
            id: "WordsSetting",
            name: i18n.t("nPlus:scoreboard.wordsSetting.name"),
            title: i18n.t("nPlus:scoreboard.wordsSetting.title"),
            class: "hide-words",
        },
    ];

    $.each(scoreboardOptions, function (i, j) {
        nPlus.addSettingsSelect(
            "Scoreboard",
            j.id, j.name, j.title,
            {
                "show": i18n.t("nPlus:scoreboard.showHide.show"),
                "hide": i18n.t("nPlus:scoreboard.showHide.hide"),
            },
            function () {
                if (this.value === "show")
                    $scoreboard.removeClass(j.class);
                else
                    $scoreboard.addClass(j.class);
            });
    });

    nPlus.addSettingsSelect(
        "Notifications",
        "NotifyBeforeGameSetting",
        i18n.t("nPlus:notifications.beforeGame.name"),
        i18n.t("nPlus:notifications.beforeGame.title"),
        {
            "off": i18n.t("nPlus:notifications.beforeGame.options.off"),
            "on": i18n.t("nPlus:notifications.beforeGame.options.on"),
        },
        function () {
            nPlus.notifyBeforeGame = this.value === "on";
        });

    nPlus.addSettingsTabSection(
        "Extra", i18n.t("nPlus:extraSettings"));

    // hard modes
    var inputBox = $("#WordInputBox");
    var excludeLetters = function (letters, localString) {
        return function () {
            var val = inputBox.val().toLowerCase();
            for (var i in letters) {
                if (val.indexOf(letters[i]) > -1) {
                    return;
                }
            }
            inputBox.val(localString);
        };
    };

    var hardModes = {
        none: function () { },
        reverse: function () {
            inputBox.val(inputBox.val().split("").reverse().join(""));
        },
        jqv: excludeLetters("jqv", i18n.t("nPlus:jqvFail")),
        alpha: function () {
            var actor = channel.data.actorsByAuthId[app.user.authId];
            if (!actor)
                return;

            var val = inputBox.val().toLowerCase();
            var currentLetter = alphabet[actor.nPlus.alpha.progress];

            if (val[0] !== currentLetter)
                inputBox.val(i18n.t("nPlus:alphaFail")
                    .replace("{0}", currentLetter.toUpperCase()));
        },
        xz: excludeLetters("xz", i18n.t("nPlus:xzFail")),
        kwxyz: excludeLetters("kwxyz", i18n.t("nPlus:kwxyzFail")),
    };
    var current = hardModes.none;

    inputBox.change(function () {
        current();
    });

    nPlus.addSettingsSelect(
        "Extra",
        "HardModes",
        i18n.t("nPlus:extra.hardModes.name"),
        i18n.t("nPlus:extra.hardModes.title"),
        {
            "none": i18n.t("nPlus:extra.hardModes.options.none"),
            "reverse": i18n.t("nPlus:extra.hardModes.options.reverse"),
            "jqv": i18n.t("nPlus:extra.hardModes.options.jqv"),
            "alpha": i18n.t("nPlus:extra.hardModes.options.alpha"),
            "xz": i18n.t("nPlus:extra.hardModes.options.xz"),
            "kwxzy": i18n.t("nPlus:extra.hardModes.options.kwxyz"),
        },
        function () {
            current = hardModes[this.value] || hardMode.none;
        });

    console.log("NN+: BombParty loaded.");

    // Init end
    // Fire a preliminary initGame if game is already started
    if (channel.data.state === "playing") {
        nPlus.fireEvent("initGame");
    }
};
nPlus.waitForLoad(bombparty);

var popsauce = function () {
    if (app.appId !== "PopSauce")
        return;

    nPlus.autoFocus = true;

    nPlus._makeHeaderButton(
        0,
        "AutoFocusButton",
        "AutoFocusSetting",
        i18n.t("nPlus:autoFocusButton"),
        true,
        function () {
            nPlus.autoFocus = this.dataset.state === "true";
        });

    nPlus.afterSocketEvent("score", function (event) {
        if (nPlus.autoFocus && event.actorId === app.user.authId) {
            setTimeout(function () {
                $("#ChatInputBox").focus();
            }, 400);
        }
    });

    nPlus.afterSocketEvent("roundEnded", function () {
        if (nPlus.autoFocus && channel.data.actorsByAuthId[app.user.authId]) {
            setTimeout(function () {
                $("#ChatInputBox").focus();
            }, 400);
        }
    });

    // Turn autocomplete on the input field off
    $("#GuessInput").attr("autocomplete", "off");

    console.log("NN+: PopSauce loaded");
};
nPlus.waitForLoad(popsauce);

};

loadJSON("twitch_global", "twitch_global");
loadJSON("twitch_subscriber", "twitch_subscriber");
loadJSON("ffz_emotes", "ffz_emotes");

loadScript("//ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js",
    function () {
        loadScript("//cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.1.1/jquery.contextMenu.min.js");
        loadStyle("//cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.1.1/jquery.contextMenu.min.css");
        loadScript("//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/jquery-ui.min.js");
    }
);
loadStyle("//ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css");
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
            element.dispatchEvent(new CustomEvent("change", {
                "detail": { nPlus: true }
            }));
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
