// ==UserScript==
// @name         Semi-automatic Facebook Activity Delete
// @namespace    http://smullindesign.com/
// @version      0.1
// @description  Open Activity Log, click red delete button. Stuck? Scroll down.
// @author       Mike Smullin <mike@smullindesign.com>
// @match        https://www.facebook.com/*/allactivity?privacy_source=activity_log_top_menu
// @grant        none
// @require      https://code.jquery.com/jquery-2.2.0.min.js
// ==/UserScript==
/* jshint -W097 */
'use strict';

// asynchronous procedural flow control
var delay = function(s,f) { return setTimeout(f,s); }
var waitFor = function(matchFn, cb) {
  var INTERVAL = 100
    , TIMEOUT  = 3000
    , tryAgain = null
    , waiting  = true
    , fuse     = delay(TIMEOUT, function() { cb('timeout'); });
  var tryAgain = function() {
    if (!waiting) return;
    var e = matchFn();
    if (e.size() > 0) {
      clearTimeout(fuse);
      waiting = false;
      return cb(null, e);
    }
    delay(INTERVAL, tryAgain);
  }
  tryAgain();
}

// jQuery filters
var visibleAboveFold = function(i, e) {
  return (e.getBoundingClientRect().top >= 42+3+63) && (e.getBoundingClientRect().bottom <= window.innerHeight); }
var contains = function(text) { return function(i,e) {
  return jQuery.trim(jQuery(e).html()) === text; }}; // non-recursive
var findVisibleTextAboveFold = function(text) {
  return jQuery(':contains("'+ text +'"):visible')
    .filter(visibleAboveFold)
    .filter(contains(text)); }

// Facebook-specific screen scrapers
// Notice they understand the page like a user would; 
// by looking for images and text, not classes.
// This makes it easier to build and maintain.
var findEditAction = function() {
  var icons = jQuery('i:visible')
        .filter(visibleAboveFold)
        .filter(function(i,e){ return jQuery(e).css('background-image') == 'url("https://static.xx.fbcdn.net/rsrc.php/v2/yP/r/-Q2FzNC-LSn.png")' })
    , pencilIcons = icons
        .filter(function(i,e){ return jQuery(e).css('background-position') == "-58px -49px" })
    , privateIcons = icons
        .filter(function(i,e){ return jQuery(e).css('background-position') == "-40px -82px" });
  return pencilIcons.add(privateIcons).first(); }
var findMoreAction = function() {
  return findVisibleTextAboveFold('More Activity').first(); }
var action = { UNLIKE: 'Unlike', DELETE: 'Delete', REMOVE_TAG: 'Report/Remove Tag' }
var findRemoveAction = function() {
  return findVisibleTextAboveFold(action.UNLIKE).first()
    .add(findVisibleTextAboveFold(action.DELETE).first())
    .add(findVisibleTextAboveFold(action.REMOVE_TAG).first())
    .first(); }
var findDeleteConfirmAction = function() {
  return findVisibleTextAboveFold('Delete Post').last(); }
var findAnnoyingRadioButton = function() {
  return jQuery('#'+ findVisibleTextAboveFold("It's annoying or not interesting").first().attr('for')); }
var findContinueButton = function() {
  return findVisibleTextAboveFold('Continue').first(); }

// This function does all the magic
var deleteOne = function(done) {
  waitFor(findEditAction, function(timeout, editAction) {
    if (timeout) {
      waitFor(findMoreAction, function(timeout, moreAction) {
        if (timeout) return alert('No Edit or More actions visible. Cannot continue.');
        moreAction.parent().click();
        done();
      });
      return console.log("Loading more activities.");
    }
    
    editAction.click();
    
    waitFor(findRemoveAction, function(timeout, removeAction) {
      if (timeout) return console.log('No Remove action visible. Starting over.');
      removeAction.click();
      switch (removeAction.text()) {
      case action.UNLIKE: return done();
      case action.DELETE:
        return waitFor(findDeleteConfirmAction, function(timeout, deleteConfirmAction) {
          deleteConfirmAction.click();
          done(); });
      case action.REMOVE_TAG:
        return waitFor(findAnnoyingRadioButton, function(timeout, annoyingRadioButton) {
          annoyingRadioButton.click();
          waitFor(findContinueButton, function(timeout, continueButton) {
            continueButton.click();
            console.log('As far as implemented. Cannot continue.');
            done(); }); });
      }
    });
  });
}

// Simple GUI overlay
jQuery('<button>').text('Delete one')
  .attr('style', 'background:red;color:white;padding:1em;font:bold 20px/1em Arial;position:fixed;top:0;right:0;z-index:9999;border:none;cursor:pointer')
  .click(function(){ deleteOne(function(){ console.log('Deleted one activity log entry.'); }); })
  .appendTo('body');
