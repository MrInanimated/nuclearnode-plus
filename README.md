# NuclearNode+

A userscript that adds tools and utilities for SparklinLabs games made using 
NuclearNode, including BombParty.

Currently, the userscript works on these games:  
http://bombparty.sparklinlabs.com  
http://popsauce.sparklinlabs.com  
http://masterofthegrid.sparklinlabs.com  
http://gemblasters.sparklinlabs.com  

## Installation

Currently, the overlay is available for Chrome and Firefox.

If you have Chrome, you will require Tampermonkey, which you can find
[here][tampermonkey].  
If you have Firefox, you will require Greasemonkey, which you can find
[here][greasemonkey].  

If/once you have Tampermonkey/Greasemonkey installed, you can use this link to
install the overlay:

[NuclearNode+][install]

Tampermonkey/Greasemonkey should automatically pick it up as a userscript, and
allow you to install it.

## Status

Currently NN+ is not yet up to feature parity with the
[BombParty Overlay][bp-overlay] yet. However, it does offer most of the
functionality non-specific to BP.

## Documentation

NN+ exposes methods on the page to allow other scripts to extend functionality
without causing conflicts.

When NN+ is run, the first thing the script does is create an `nPlus` object in
the context of the page, along with a method `nPlus.waitForLoad`. If writing a
script requiring access to other `nPlus` methods, you should wrap the body of
the script in a function, then pass that function to `nPlus.waitForLoad`.

#### `nPlus.waitForLoad(fn: Function)`
Attaches a callback to be called when the NN+ core has loaded.  
Note that _this is the only function that you should assume exists on the nPlus
object at the point just after executing the script_.

At the point the callback is executed, it's safe to assume the existence of and
attach events to the other `nPlus` methods and `channel.socket`.

Callbacks are called in the order they were supplied to this method.

If NN+ has already loaded, the callback is called immediately.

```js
var body = function () {
    // body of script to go in here...
};
nPlus.waitForLoad(body);
```

### Attaching/Patching Socket Event Listeners

Should you want to run functions before/after the default listeners of the game,
it's recommended to use the supplied `nPlus` functions instead of attempting to
monkey-patch the existing listeners.

It should be noted that attaching listeners via this method does not affect the
listeners list `channel.socket` maintains. You may still manipulate the
`channel.socket.listeners` lists if you wish.

The actual execution order, when receiving a socket event, is this:  
1. Listeners attached using `nPlus.beforeSocketEvent`, if any
2. Listeners attached using `channel.socket.on`, if any
3. Listeners attached using `nPlus.afterSocketEvent`, if any

#### `nPlus.beforeSocketEvent(event: string, fn: Function)`
#### `nPlus.afterSocketEvent(event: string, fn: Function)`
Attach a listener to a socket event that fires before/after all the listeners
attached using `channel.socket.on`.

The events are passed along to the listeners the same way they are passed along
to the listeners attached using `channel.socket.on`.

```js
nPlus.beforeSocketEvent("winWord", function (event) {
    // As an example, suppose we need to detect someone gaining a life
    // The game doesn't fire an event on someone gaining a life, so we need to
    // detect this by checking the state of the game actor before the default
    // function changes it.

    var actor = channel.data.usersByAuthId[event.playerAuthId];
    var lastWord = actor.lastWord.toLowerCase();
    var lockedLetters = actor.lockedLetters;
    var lettersLeft = lockedLetters.filter(function (i) {
        return lastWord.indexOf(i) > -1;
    })

    if (lettersLeft.length === 0) {
        console.log(actor.displayName + " flipped!");
    }
});
```
#### `nPlus.beforeListeners(event: string)`
#### `nPlus.afterListeners(event: string)`
Gets the array of listeners attached using `nPlus.beforeSocketEvent` or
`nPlus.afterSocketEvent` respectively.

It's recommended that you don't manipulate these arrays directly.

```js
var listeners = nPlus.beforeListeners("winWord");
```

#### `nPlus.removeBeforeListener(event: string, fn: Function)`
#### `nPlus.removeAfterListener(event: string, fn: Function)`
Removes a listener from the list of listeners attached using
`nPlus.beforeSocketEvent` or `nPlus.afterSocketEvent` respectively.

If there are multiple references to the same listener attached to the same
event, the first occurence will be removed.

```js
var listener = function () {
    // listener code...
};

// Attaches listener to winWord
nPlus.beforeSocketEvent("winWord", listener);

// Removes listener from winWord
nPlus.removeBeforeListener("winWord", listener);
```

### Custom Events

NN+ also provides functionality to define and listen to custom events. For
example, eventually the plan for the BombParty side of the script will be for it
to define custom events like `gainLife` and `loseLife` in order to make checking
for if those things have happened easier and, if multiple scripts are running,
for them to only need one check across all of them to see if the thing happened.

#### `nPlus.fireEvent(event: string[, ...])`
Fires a custom event, passing the provided arguments to all listeners attached
to this event.

Note that this method accepts any number of arguments.

#### `nPlus.on(event: string, fn: Function)`
Attaches a listener for a custom event.

```js
nPlus.on("exampleEvent", function (arg1, arg2, arg3) {
    console.log("Argument 1:", arg1);
    console.log("Argument 2 + Argument 3:", arg2 + arg3);  
});

nPlus.fireEvent("exampleEvent", 1, 2, 3);
// Argument 1: 1
// Argument 2 + Argument 3: 5
```

#### `nPlus.listeners(event: string)`
Gets a list of all custom event listeners attached to a custom event.

It is recommended you do not manipulate this list directly.

```js
var listeners = nPlus.listeners("exampleEvent");
```

#### `nPlus.removeListener(event: string, fn: Function)`
Removes a listener attached to a specific event.

If there are multiple references to the same listener attached to the same
event, the first occurence will be removed.

```js
var listener = function () {
    // listener code...
};

// Attaches listener to exampleEvent
nPlus.on("exampleEvent", listener);

// Removes listener from exampleEvent
nPlus.removeListener("exampleEvent", listener);
```

### Settings Tab

NN+ creates a settings tab in the sidebar, and provides methods to define new
sections and add options to existing settings sections.

#### `nPlus.addSettingsTabSection(id: string, name: string)`
Adds a new section to the setting tab, to which settings can be appended to.
This will create a heading and a table to which settings can be added later
using `nPlus.addSettingsSelect`.

The parameters required are the ID of the section (which will be used to refer
to the section from now on) and the display name of the section. Note the ID is
not necessarily the ID of the actual DOM element.

```js
nPlus.addSettingsTabSection("Chat", "Chat Settings");
```

#### `nPlus.addSettingsSelect(sectionId: string, id: string, name: string, title: string?, options: Object, callback: Function)`
Adds a select element to the specified settings section.

The `sectionId` argument is the section ID used to create the section with in
`nPlus.addSettingsTabSection`.

The `title` argument is nullable, but if it is not null, a (?) will display next
to the name of the setting which when hovered over gives the title text.

The `options` argument is a string-string map of option value to displayed text.

The `callback` argument is a handler that is triggered when `change` fires on
the select.

```js
nPlus.addSettingsSelect(
    "Chat",
    "ExampleSelect",
    "Example Setting",
    "This setting is an example.",
    {
        "option1": "Option 1",
        "option2": "Option 2",
    },
    function () {
        switch (this.value) {
            case "option":
                // code handling option1
                break;
            case "option2":
                // code handling option2
                break;
        }
    }
);
```

#### `nPlus.addCustomSettingsElement(sectionId: string, element, name: string, title: string?)`
Adds a custom element to the specified settings section.

The `sectionId` argument is the section ID used to create the section with in
`nPlus.addSettingsTabSection`.

The `element` argument can be anything that's accepted by the jQuery method
`$.append`, since it just gets passed along to that method.

The `title` argument is nullable, but if it is not null, a (?) will display next
to the name of the setting which when hovered over gives the title text.

```js
var $exampleSlider = $("<input>")
    .attr("type", "range")
    .attr("id", "ExampleSlider")
    .on("change", function () {
        // do something with the slider value
    });

nPlus.addCustomSettingsElement(
    "Chat",
    $exampleSlider,
    "Example Slider",
    "This is an example slider."
);
```

#### `nPlus.addCustomSettingsHeader(id: string, name: string)`
This method is very similar to `nPlus.addSettingsTabSection`, but it does not
create a table for settings and instead returns the empty element created. This
is useful for adding sections to the settings tab that do not follow the
standard table format for settings, such as the user list.

The created sections also always go _after_ the sections created by
`nPlus.addSettingsTabSection`.

```js
var $userListContainer = nPlus.addCustomSettingsHeader("UserList", "User List");

// Do whatever with $userListContainer, which is just an empty <div> element
```

#### `nPlus.addCreditsEntry(name: string, html: string)`
Add a credits entry to the credits table. The second argument accepts any HTML
so you can add links in the credits table.

#### `nPlus.addCreditsHeader(name: string)`
Add a header row to the credits table.

```js
nPlus.addCreditsHeader("NN+ Core:");
nPlus.addCreditsEntry("Coder", "MrInanimated");
```

### Localisation
Since SparklinLabs games support two languages, English and French, it is
customary to provide both languages to users. Since NuclearNode uses `i18n` it
is recommended to use `i18n.addResourceBundle` and `i18n.t` to provide your own
localisations.

### Miscellaneous

Miscellaneous methods that are also exposed.

#### `nPlus.addCustomEmote`
Adds an emote to also be rendered.

The expected input parameter is an object:
```js
{
    code: "Chat message text to replace with this emote",
    src: "URL of the source image of the emote",
    titlePrefix: "A prefix to display before the code of the emote in the " +
                 "title-text, to indicate its origin"
}
```

TODO: Add example

[tampermonkey]: http://tampermonkey.net/
[greasemonkey]: https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/
[install]: https://github.com/MrInanimated/nuclearnode-plus/raw/master/dist/nplus.user.js
[bp-overlay]:https://github.com/MrInanimated/bp-overlay