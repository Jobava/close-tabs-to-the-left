const Cc = Components.classes;
const Ci = Components.interfaces;

var l = {default: ['Close Tabs to the Left', 'L'], de: ['Linke Tabs schließen', 'E'], fr: ['Fermer les onglets situés à gauche', 'G'], es: ['Cerrar pestañas a la izquierda', 'L'], pl: ['Zamknij karty po lewej stronie', 'L'], ru: ['Закрыть вкладки спева', 'р'], ro: ['Închide filele de la stânga', 's']}, cl;

var WindowListener = {
  setupBrowserUI: function(window) {

    let document = window.document;

    cl = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIXULChromeRegistry).getSelectedLocale("global").toLowerCase().match('^[a-z]*');
    if (cl.length) cl = cl[0];

    if (!l[cl]) cl = 'default';

    window.tableft = {};
    window.tableft.warn = function(tabsToClose)
    {
     if (tabsToClose <= 1)
      return true;

     const pref = "browser.tabs.warnOnCloseOtherTabs";
     var shouldPrompt = window.Services.prefs.getBoolPref(pref);
     if (!shouldPrompt)
      return true;

     var ps = window.Services.prompt;
     var warnOnClose = { value: true };
     var bundle = this.mStringBundle;

     window.focus();
     var warningMessage = window.PluralForm.get(tabsToClose, bundle.getString("tabs.closeWarningMultiple")).replace("#1", tabsToClose);
     var buttonPressed = ps.confirmEx(window, bundle.getString("tabs.closeWarningTitle"), warningMessage, (ps.BUTTON_TITLE_IS_STRING * ps.BUTTON_POS_0) + (ps.BUTTON_TITLE_CANCEL * ps.BUTTON_POS_1), bundle.getString("tabs.closeButtonMultiple"), null, null, null, warnOnClose);
     var reallyClose = (buttonPressed == 0);

     return reallyClose;
    }
    window.tableft.closeTabsBefore = function(tab)
    {
     var tc = [], tabs = window.gBrowser.visibleTabs, t;
     for(t=0;tabs[t]!=tab;t++)
     if (!tabs[t].pinned)
     tc.push(tabs[t]);

     if (window.tableft.warn.apply(window.gBrowser, [tc.length]))
     {
      for(t=0;t<tc.length;t++)
      window.gBrowser.removeTab(tc[t], {animate: true});
     }
    }

    window.TabContextMenu._updateContextMenu = window.TabContextMenu.updateContextMenu;
    window.TabContextMenu.updateContextMenu = function(arg)
    {
     window.TabContextMenu._updateContextMenu.apply(window.TabContextMenu, [arg]);
  
     var tc = 0, tabs = window.gBrowser.visibleTabs, t;
     for(t=0;tabs[t]!=this.contextTab;t++)
     if (!tabs[t].pinned)
     {
      tc=1; break;
     }

     document.getElementById("context_closeTabsBefore").disabled = !tc;
     document.getElementById("context_closeTabsBefore").hidden = this.contextTab.pinned;
    }

    var tl = document.createElement('menuitem');
    tl.id = 'context_closeTabsBefore';
    tl.setAttribute('label', decodeURIComponent(escape(l[cl][0])));
    tl.setAttribute('oncommand', 'tableft.closeTabsBefore(TabContextMenu.contextTab)');
    tl.setAttribute('accesskey', decodeURIComponent(escape(l[cl][1])));

    document.getElementById('tabContextMenu').insertBefore(tl, document.getElementById('context_closeTabsToTheEnd'));

  },

  tearDownBrowserUI: function(window) {
    let document = window.document;
   
    window.TabContextMenu.updateContextMenu = window.TabContextMenu._updateContextMenu;

    document.getElementById('tabContextMenu').removeChild(document.getElementById('context_closeTabsBefore'));
  },

  // nsIWindowMediatorListener functions
  onOpenWindow: function(xulWindow) {
    // A new window has opened
    let domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                             .getInterface(Ci.nsIDOMWindow);

    // Wait for it to finish loading
    domWindow.addEventListener("load", function listener() {
      domWindow.removeEventListener("load", listener, false);

      // If this is a browser window then setup its UI
      if (domWindow.document.documentElement.getAttribute("windowtype") == "navigator:browser")
        WindowListener.setupBrowserUI(domWindow);
    }, false);
  },

  onCloseWindow: function(xulWindow) {
  },

  onWindowTitleChange: function(xulWindow, newTitle) {
  }
};

function startup(data, reason) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
  
  // Get the list of browser windows already open
  let windows = wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);

    WindowListener.setupBrowserUI(domWindow);
  }

  // Wait for any new browser windows to open
  wm.addListener(WindowListener);
}

function shutdown(data, reason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (reason == APP_SHUTDOWN)
    return;

  let wm = Cc["@mozilla.org/appshell/window-mediator;1"].
           getService(Ci.nsIWindowMediator);

  // Get the list of browser windows already open
  let windows = wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);

    WindowListener.tearDownBrowserUI(domWindow);
  }

  // Stop listening for any new browser windows to open
  wm.removeListener(WindowListener);
}
