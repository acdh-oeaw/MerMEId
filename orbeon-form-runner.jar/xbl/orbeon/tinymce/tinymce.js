/**
 * Copyright (C) 2012 Orbeon, Inc.
 *
 * This program is free software; you can redistribute it and/or modify it under the terms of the
 * GNU Lesser General Public License as published by the Free Software Foundation; either version
 * 2.1 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * The full text of the license is available at http://www.gnu.org/copyleft/lesser.html
 */
(function() {
    var $ = ORBEON.jQuery;
    var YD = YAHOO.util.Dom;
    var Events = ORBEON.xforms.Events;

    var baseUrlInitialized = false;

    YAHOO.namespace("xbl.fr");
    YAHOO.xbl.fr.Tinymce = function() {};
    ORBEON.xforms.XBL.declareClass(YAHOO.xbl.fr.Tinymce, "xbl-fr-tinymce");
    YAHOO.xbl.fr.Tinymce.prototype = {

        groupElement: null,
        visibleInputElement: null,
        myEditor: null,
        serverValueOutputId: null,
        tinymceInitialized: false,

        init: function() {

            if (! baseUrlInitialized) {
                // Tell TinyMCE about base URL, which it can't guess in combined resources

                var href = $('.tinymce-base-url').attr('href');
                // Remove the magic number and extension at the end of the URL. The magic number was added to allow for
                // URL post-processing for portlets. The extension is added so that the version number is added to the URL.
                var baseURL = href.substr(0, href.length - '1b713b2e6d7fd45753f4b8a6270b776e.js'.length);
                tinymce.baseURL = baseURL; // doc says base URL must end with "/" -> wrong leads to // in theme path

                baseUrlInitialized = true;
            }

            this.serverValueOutputId = YAHOO.util.Dom.getElementsByClassName('xbl-fr-tinymce-xforms-server-value', null, this.container)[0].id;

            // Create TinyMCE editor instance
            var tinyMceConfig = (function() {
                // Use global TINYMCE_CUSTOM_CONFIG is setup by users
                var config =
                    typeof TINYMCE_CUSTOM_CONFIG !== "undefined" ?
                    TINYMCE_CUSTOM_CONFIG :
                    YAHOO.xbl.fr.Tinymce.DefaultConfig;
                return config;
            }).call(this);
            var tinyMceDiv = YAHOO.util.Dom.getElementsByClassName('xbl-fr-tinymce-div', null, this.container)[0];
            var tabindex = $(tinyMceDiv).attr('tabindex');
            this.myEditor = new tinymce.Editor(tinyMceDiv.id, tinyMceConfig, tinymce.EditorManager);
            var xformsValue = ORBEON.xforms.Document.getValue(this.serverValueOutputId);
            this.onInit(_.bind(function() {
                // Send value to the server on blur
                this.myEditor.on("blur", _.bind(this._clientToServer, this));
                // Remove an anchor added by TinyMCE to handle key, as it grabs the focus and breaks tabbing between fields
                $(this.container).find('a[accesskey]').detach();
                this.myEditor.setContent(xformsValue);
                var iframe = $(this.container).find('iframe');
                // On click inside the iframe, propagate the click outside, so code listening on click on an ancestor gets called
                iframe.contents().on('click', _.bind(function() { this.container.click(); }, this));
                $(iframe[0].contentWindow).on('focus', _.bind(this.onFocus, this));
                // Copy the tabindex on the iframe
                if (!_.isUndefined(tabindex)) iframe.attr('tabindex', tabindex);
                this.tinymceInitialized = true;
                Events.componentChangedLayoutEvent.fire();
            }, this));

            // Render the component when visible (see https://github.com/orbeon/orbeon-forms/issues/172)
            // - unfortunately, we need to use polling; can't use Ajax response e.g. if in Bootstrap tab, as
            //   in FB Control Settings dialog
            var renderIfVisible = _.bind(function() {
                if ($(tinyMceDiv).is(':visible')) {
                    this.myEditor.render();
                } else {
                    var shortDelay = ORBEON.util.Properties.internalShortDelay.get();
                    _.delay(renderIfVisible, shortDelay);
                }
            }, this);
            renderIfVisible();
        },

        // Send value in MCE to server
        _clientToServer: function() {
            var editor = arguments[0];
            var content = this.myEditor.getContent();
            // Workaround to TinyMCE issue, see https://twitter.com/avernet/status/579031182605750272
            if (content == '<div>\xa0</div>') content = '';
            ORBEON.xforms.Document.dispatchEvent({
                targetId:   this.container.id,
                eventName:  'fr-set-client-value',
                properties: { 'fr-value': content }
            });
        },

        // TinyMCE got the focus
        onFocus: function(event) {
            event.target = this.container;                          // From the perspective of the XForms engine, the focus is on the XBL component
            Events.focus(event);                                    // Forward to the "XForms engine"
        },

        hasFocus: function() {
            var activeElement = $(document.activeElement);
            return activeElement.parents().is(this.container) ||    // Focus on an element inside the component (most likely the edition iframe)
                activeElement.parent('.mceListBoxMenu').is('*');    // Focus is on absolutely positioned menu
        },

        // Update MCE with server value
        serverToClient: function() {
            var doUpdate =
                this.tinymceInitialized &&                          // Don't update value until TinyMCE is fully initialized
                ! this.hasFocus();                                  // Heuristic: if TinyMCE has focus, users might still be editing so don't update
            if (doUpdate) {
                var newServerValue = ORBEON.xforms.Document.getValue(this.serverValueOutputId);
                this.myEditor.setContent(newServerValue);
            }
        },

        // Runs a function when the TinyMCE is initialized
        onInit: function(f) {
            var bound = _.bind(f, this);
            if (this.tinymceInitialized) bound();
            else this.myEditor.on("init", bound);
        },

        xformsFocus: function() { this.onInit(function() { this.myEditor.focus(); })},
        readonly:    function() { this.onInit(function() { this.myEditor.getBody().contentEditable = false; })},
        readwrite:   function() { this.onInit(function() { this.myEditor.getBody().contentEditable = true; })}
    };

})();
