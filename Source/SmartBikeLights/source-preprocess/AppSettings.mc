using Toybox;
using Toybox.Lang;
using Toybox.WatchUi;
using Toybox.Application.Properties as Properties;

(/* #include TARGET */)
module /* #if touchScreen */ TouchAppSettings /* #else */ AppSettings /* #endif */ {

    const themeValues = [0, 1, 2];
    const themeNames = [:Blue, :Violet, :Mint];
    const configurationNames = [:Primary, :Secondary, :Tertiary];
    const configurationNameValues = ["CN1", "CN2", "CN3"];
    const configurationValues = [1, 2, 3];
    const settingValues = ["IL", "TH", "CC"];
// #if dataField
    const buttonNames = ["", "Center", "Top", "Right", "Bottom", "Left"];
// #endif

    class BaseMenu extends /* #include UIMODULE */Menu2 {
        protected var viewRef;

        public function initialize(view) {
            Menu2.initialize(null);
            viewRef = view != null ? view.weak() : null;
        }

        public function close() {
// #if touchScreen
            DataFieldUi.popMenu();
// #else
            WatchUi.popView(WatchUi.SLIDE_IMMEDIATE);
// #endif
        }

        public function openSubMenu(menu) {
// #if touchScreen
            DataFieldUi.pushMenu(menu);
// #else
            WatchUi.pushView(menu, new MenuDelegate(menu), WatchUi.SLIDE_IMMEDIATE);
// #endif
        }
    }

    class Menu extends BaseMenu {

        public function initialize(view) {
            BaseMenu.initialize(view);

            Menu2.setTitle("Settings");
            // Invert lights
            Menu2.addItem(new /* #include UIMODULE */ToggleMenuItem(Rez.Strings.IL, null, 0, Properties.getValue("IL"), null));
            // Theme
            var themeIndex = themeValues.indexOf(Properties.getValue("TH"));
            Menu2.addItem(new /* #include UIMODULE */MenuItem(Rez.Strings.TH, (themeIndex < 0 ? null : Rez.Strings[themeNames[themeIndex]]), 1, null));
            // Current configuration
            var configurationIndex = configurationValues.indexOf((Properties.getValue("CC")));
            Menu2.addItem(new /* #include UIMODULE */MenuItem(Rez.Strings.CC, (configurationIndex < 0 ? null : Properties.getValue(configurationNameValues[configurationIndex])), 2, null));
// #if dataField
            // Remote controllers
            if (view.remoteControllers != null && view.remoteControllers.size() > 0) {
                Menu2.addItem(new /* #include UIMODULE */MenuItem(Rez.Strings.RemoteControllers, null, 3, null));
            }
// #endif
            Menu2.addItem(new /* #include UIMODULE */MenuItem("About", Rez.Strings.AppVersion, 4, null));
        }

// #if dataField
        // This method will be called only for native Menu2
        // As the current configuration is not updated for Edge touchscreen devices until the menu is closed,
        // there is no point in supporting onShow for custom Menu2
        public function onShow() {
            var view = viewRef.get();
            var hasRemoteControllers = view.remoteControllers != null && view.remoteControllers.size() > 0;
            var index = Menu2.findItemById(3);
            if (hasRemoteControllers && index < 0) {
                Menu2.addItem(new /* #include UIMODULE */MenuItem(Rez.Strings.RemoteControllers, null, 3, null));
            } else if (!hasRemoteControllers && index >= 0) {
                Menu2.deleteItem(index);
            }
        }
// #endif

        public function onSelect(index, menuItem) {
            if (index == 4) {
                openSubMenu(new AboutMenu());
                return;
            }

            var key = index < settingValues.size() ? settingValues[index] : null;
            if (index == 0) {
                var newValue = !Properties.getValue(key); // Toggle invert lights
                menuItem.setEnabled(newValue);
                Properties.setValue(key, newValue);
// #if settings
                Application.getApp().onSettingsChanged();
// #endif
            } else {
// #if dataField
                openSubMenu(index == 1 ? new ListMenu("Theme", key, menuItem, themeValues, themeNames, null)
                    : index == 2 ? new ListMenu("Configuration", key, menuItem, configurationValues, configurationNames, configurationNameValues)
                    : new ControllersMenu(viewRef.get()));
// #else
                openSubMenu(index == 1
                    ? new ListMenu("Theme", key, menuItem, themeValues, themeNames, null)
                    : new ListMenu("Configuration", key, menuItem, configurationValues, configurationNames, configurationNameValues));
// #endif
            }
        }
    }

    class AboutMenu extends BaseMenu {

        public function initialize() {
            BaseMenu.initialize(null);
            Menu2.setTitle("About");
            Menu2.addItem(new /* #include UIMODULE */MenuItem("Version", Rez.Strings.AppVersion, 0, null));
            Menu2.addItem(new /* #include UIMODULE */MenuItem("Tag", Rez.Strings.AppTag, 1, null));
            Menu2.addItem(new /* #include UIMODULE */MenuItem("Commit", Rez.Strings.AppCommit, 2, null));
        }

        public function onSelect(index, menuItem) {
            // Version information is read-only.
        }
    }

// #if dataField
    class ControllersMenu extends BaseMenu {

        public function initialize(view) {
            BaseMenu.initialize(view);
            Menu2.setTitle("Controllers");

            var controllers = view.remoteControllers;
            if (controllers == null) {
                return;
            }

            for (var i = 0; i < controllers.size(); i++) {
                Menu2.addItem(new /* #include UIMODULE */MenuItem("Pair " + controllers[i][1] /* Name */, null, i, null));
            }
        }

        public function onSelect(index, menuItem) {
            openSubMenu(new PairControllerMenu(viewRef.get(), index));
        }
    }

    class PairControllerMenu extends BaseMenu {

        private var _controllerIndex;
        private var _buttonIndex = 2; // Index of the first button

        public function initialize(view, controllerIndex) {
            BaseMenu.initialize(view);
            _controllerIndex = controllerIndex;
            Menu2.setTitle("Pairing");
            Menu2.addItem(new /* #include UIMODULE */MenuItem("Starting...", null, 0, null));
            Menu2.addItem(new /* #include UIMODULE */MenuItem("Cancel", null, 1, null));

            view.releaseLightSensors();
            startPairingNextButton();
        }

        public function onSelect(index, menuItem) {
            if (index == 1 /* Cancel */) {
                close();
            }
        }

        public function close() {
            BaseMenu.close();
            var view = viewRef.get();
            view.setupLightSensors(); // Setup again all light sensors
        }

        public function onLightConntected(controllerIndex, buttonIndex) {
            if (_buttonIndex == buttonIndex) {
                _buttonIndex++;
                startPairingNextButton();
            }
        }

        private function startPairingNextButton() {
            var view = viewRef.get();
            var menuItem = getItem(0);
            var controller = view.remoteControllers[_controllerIndex];
            var button = null;
            var error = null;
            while (_buttonIndex < controller.size()) {
                button = controller[_buttonIndex];
                if (button[1] /* Device number*/ <= 0) {
                    _buttonIndex++;
                    continue;
                }

                error = view.startLightSensor(_controllerIndex, _buttonIndex, null, method(:onLightConntected));
                break;
            }

            var completed = _buttonIndex >= controller.size();
            var text = completed ? "Paring complete"
                : error != null ? "Error " + error
                : "Pair " + buttonNames[button[0] /* Button id */] + " button";
            menuItem.setLabel(text);
            if (completed) {
                Menu2.deleteItem(1);
            }
        }
    }
// #endif

    class DisplayOptionsMenu extends BaseMenu {
        public function initialize() {
            BaseMenu.initialize(null);
            Menu2.setTitle(WatchUi.loadResource(Rez.Strings.DisplayOptions));
            Menu2.addItem(new /* #include UIMODULE */ToggleMenuItem(Rez.Strings.TO, null, -1, Properties.getValue("TO") == true, null));
            Menu2.addItem(new /* #include UIMODULE */ToggleMenuItem(Rez.Strings.Brightness, null, -2, Properties.getValue("ShowBrightness") == true, null));
            Menu2.addItem(new /* #include UIMODULE */ToggleMenuItem(Rez.Strings.Runtime, null, -3, Properties.getValue("ShowRuntime") == true, null));
            Menu2.addItem(new /* #include UIMODULE */ToggleMenuItem(Rez.Strings.RuntimeFill, null, -4, Properties.getValue("ShowRuntimeFill") == true, null));
        }

        public function onSelect(index, menuItem) {
            var toggleKey = index == -1 ? "TO" : index == -2 ? "ShowBrightness" : index == -3 ? "ShowRuntime" : "ShowRuntimeFill";
            var enabled = Properties.getValue(toggleKey) != true;
            Properties.setValue(toggleKey, enabled);
            menuItem.setEnabled(enabled);
// #if settings
            Application.getApp().onSettingsChanged();
// #endif
        }
    }

    class ListMenu extends BaseMenu {

        private var _menuItem;
        private var _key;
        private var _values;
        private var _names;
        private var _nameKeys;

        public function initialize(title, key, menuItem, values, names, nameKeys) {
            BaseMenu.initialize(null);
            Menu2.setTitle(title);
            _key = key;
            _menuItem = menuItem.weak();
            _values = values;
            _names = names;
            _nameKeys = nameKeys;
            if (key.equals("TH")) {
                Menu2.addItem(new /* #include UIMODULE */MenuItem(Rez.Strings.DisplayOptions, null, -1, null));
            }
            for (var i = 0; i < values.size(); i++) {
                var value = values[i];
                var name = nameKeys != null ? Properties.getValue(nameKeys[i]) : null;
                if (name == null) {
                    name = names[i];
                    name = name instanceof String ? name : Rez.Strings[name];
                }

                Menu.addItem(new /* #include UIMODULE */MenuItem(name, null, value, null));
            }
        }

        public function onSelect(newValue, menuItem) {
            if (_key.equals("TH") && newValue == -1) {
                openSubMenu(new DisplayOptionsMenu());
                return;
            }
            var oldValue = Properties.getValue(_key);
            if (oldValue == newValue) {
                close();
                return;
            }

            // Set new value
            Properties.setValue(_key, newValue);
// #if settings
            Application.getApp().onSettingsChanged();
// #endif
            // Set parent sub label
            var index = _values.indexOf(newValue);
            if (_menuItem.stillAlive() && index >= 0) {
                var name = _nameKeys != null ? Properties.getValue(_nameKeys[index]) : null;
                if (name == null) {
                    name = _names[index];
                    name = name instanceof String ? name : Rez.Strings[name];
                }

                _menuItem.get().setSubLabel(name);
            }

            close();
        }
    }
}