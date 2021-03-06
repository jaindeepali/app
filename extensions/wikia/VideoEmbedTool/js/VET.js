/*global UserLogin, WikiaEditor*/

/*
 * Author: Inez Korczynski, Bartek Lapinski, Hyun Lim, Liz Lee
 */


/*
 * Variables
 */
(function($, window) {
	var VET_panel = null;
	var VET_curSourceId = 0;
	var VET_lastQuery = new Array();
	var VET_jqXHR = {
		abort: function() {
			// empty function so if statements will not have to be embedded everywhere
		}
	};
	var VET_curScreen = 'Main';
	var VET_prevScreen = null;
	var VET_slider = null;
	var VET_orgThumbSize = null;
	var VET_height = null;
	var VET_wysiwygStart = 1;
	var VET_ratio = 1;
	var VET_shownMax = false;
	var VET_notificationTimout = 4000; // Show notifications for this long and then hide them
	var VET_options = {};
	var VET_embedPresets = false;
	var VET_callbackAfterSelect = $.noop;
	var VET_callbackAfterEmbed = $.noop;
	var VET_MAX_WIDTH = 670; // 670 max width on oasis
	var VET_MIN_WIDTH = 100;
	var VET_DEFAULT_WIDTH = 335;
	var VET_thumbSize = VET_DEFAULT_WIDTH;	// variable that can change later, defaulted to DEFAULT

	var VET_tracking = (function() {
		var config = {
				action: Wikia.Tracker.ACTIONS.CLICK,
				category: 'vet',
				trackingMethod: 'both'
			},
			slice = [].slice,
			track = ( window.WikiaEditor && WikiaEditor.track ) || Wikia.Tracker.track;

		return function() {
			track.apply( track, [ config ].concat( slice.call( arguments ) ) );
		};
	})();

	// ajax call for 2nd screen (aka embed screen)
	function VET_editVideo() {
		$('#VideoEmbedMain').hide();

		var callback = function(o) {
			var data = VET_embedPresets;

			VET_displayDetails(o.responseText, data);

			$('#VideoEmbedBack').hide();

			setTimeout(function() {
				if ( data.thumb || data.thumbnail ) {
		             $("#VideoEmbedThumbOption").attr('checked', 'checked');
		             $('#VET_StyleThumb').addClass('selected');
		        }  else {
		        	 $('#VideoEmbedSizeRow > div').children('input').removeClass('show');
					 $('#VideoEmbedSizeRow > div').children('p').addClass('show');
		        	 $("#VideoEmbedThumbOption").attr('checked', '');
		             $("#VideoEmbedNoThumbOption").attr('checked', 'checked');
		             $('#VET_StyleThumb').removeClass('selected');
		             $('#VET_StyleNoThumb').addClass('selected');
		        }

				if(data.align && data.align == 'left') {
					$('#VideoEmbedLayoutLeft').attr('checked', 'checked').parent().addClass('selected');
				} else if (data.align && data.align == 'center') {
					$('#VideoEmbedLayoutCenter').attr('checked', 'checked').parent().addClass('selected');
				} else {
					$('#VideoEmbedLayoutRight').attr('checked', 'checked').parent().addClass('selected');
				}

				if(data.width) {
					VET_readjustSlider( data.width );
					$('#VideoEmbedManualWidth').val( data.width );
				}

			}, 200);
			if(data.caption) {
				$('#VideoEmbedCaption').val(data.caption);
			}

			// show width slider
			VET_toggleSizing(true);

			// show alignment row
			$( '#VideoEmbedLayoutRow' ).css('display', '');

			// make replace video link to open in new window / tab
			$('#VideoReplaceLink a').first().attr('target', '_blank');
		};

		VET_jqXHR.abort();
		var params = [];
		var escTitle = "";
		if ( typeof(VET_embedPresets.href) == "undefined" ) {
			escTitle = VET_embedPresets.title;
		} else {
			escTitle = VET_embedPresets.href;
		}
		escTitle = encodeURIComponent(escTitle);
		params.push( 'itemTitle='+escTitle );

		VET_jqXHR = $.ajax(
			wgScriptPath + '/index.php?action=ajax&rs=VET&method=editVideo&' + params.join('&'),
			{
				method: 'get',
				complete: callback,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
				}
			}
		);
	}

	// Collect embed settings from form and send to callbackAfterEmbed
	function VET_doEditVideo() {

		var description = encodeURIComponent($('#VideoEmbedDescription').val());

		$.nirvana.sendRequest({
			controller: 'VideoEmbedTool',
			method: 'editDescription',
			type: 'POST',
			format: 'json',
			data: {
				title: $('#VideoEmbedName').val(),
				description: description
			}
		}).done(function(json) {
			if(json.status == "fail") {
				GlobalNotification.show( json.errMsg, 'error', null, VET_notificationTimout );
			} else {
				// setup metadata
				var extraData = {};

				extraData.href = $('#VideoEmbedHref').val();
				extraData.width= $('#VideoEmbedManualWidth').val();

				if ($('#VideoEmbedThumbOption').is(':checked')) {
					extraData.thumb = 1;
				}

				if( $('#VideoEmbedLayoutLeft').is(':checked') ) {
					extraData.align = 'left';
				} else if ($('#VideoEmbedLayoutCenter').is(':checked') ) {
					extraData.align = 'center';
				} else {
					extraData.align = 'right';
				}

				if ($('#VideoEmbedCaption').val()) {
					 extraData.caption = $('#VideoEmbedCaption').val();
				}

				if(VET_callbackAfterEmbed) {
					// Callback from extensions
					VET_callbackAfterEmbed(extraData);
				}
			}
		});

	}

	// macbre: move back button inside dialog content and add before provided selector (Oasis changes)
	function VET_moveBackButton(selector) {
		// store back button
		if (!window.VETbackButton) {
			var backButtonOriginal = $('#VideoEmbedBack');
			var backButton = backButtonOriginal.clone();

			// keep the original one, but force it to be hidden
			backButtonOriginal.css('visibility', 'hidden');

			// remove an image and add button class
			backButton.removeAttr('id').remove();

			// keep reference to <a> tag
			backButton = backButton.children('a').addClass('wikia-button yui-back secondary v-float-right');
			window.VETbackButton = backButton;
		}

		// remove previous instances of .yui-back
		$('.yui-back').remove();

		// move button
		window.VETbackButton.clone().
			click(VET_back).
			insertAfter(selector);
	}

	/*
	 * Functions/methods
	 */

	function VET_toggleSizing( enable ) {
		if( enable ) {
			$( '#VideoEmbedThumbOption' ).attr('disabled', false);
			$( '#VideoEmbedNoThumbOption' ).attr('disabled', false);
			$( '#VideoEmbedWidthRow' ).css('display', '');
			$( '#VideoEmbedSizeRow' ).css('display', '');
		} else {
			$( '#VideoEmbedThumbOption' ).attr('disabled', true);
			$( '#VideoEmbedNoThumbOption' ).css('disabled', true);
			$( '#VideoEmbedWidthRow' ).css('display', 'none');
			$( '#VideoEmbedSizeRow' ).css('display', 'none');
		}
	}

	function VET_manualWidthInput() {
	    var val = parseInt( this.value );
	    if ( isNaN( val ) ) {
			VET_readjustSlider( 0 );
			return false;
	    }
	    if(val > VET_MAX_WIDTH) {
		    val = VET_MAX_WIDTH;
		    $( '#VideoEmbedManualWidth' ).val(val);
	    }
		VET_readjustSlider( val );
	}

	function VET_readjustSlider( value ) {
		$('#VideoEmbedSlider').slider && $('#VideoEmbedSlider').slider({
			value: value
		});
	}

	function VET_show( options ) {
		// Handle MiniEditor focus
		// (BugId:18713)
		if (window.WikiaEditor) {
			var wikiaEditor = WikiaEditor.getInstance();
			if(wikiaEditor.config.isMiniEditor) {
				wikiaEditor.plugins.MiniEditor.hasFocus = true;
			}
		}

		/* set options */
		VET_options = options;
		VET_embedPresets = options.embedPresets;
		VET_wysiwygStart = options.startPoint || 1;
		VET_callbackAfterSelect = options.callbackAfterSelect || $.noop;
		VET_callbackAfterEmbed = options.callbackAfterEmbed || $.noop;

		VET_tracking({
			label: 'open'
		});

		if(VET_wysiwygStart == 2) {
			if(options.size) {
				VET_thumbSize = options.size;
			}
			VET_editVideo();
		} else {
			VET_loadMain(options.searchOrder);
		}

		$('#VideoEmbedBack').click(VET_back);
	}

	/* ajax call for first screen (aka video search) */
	function VET_loadMain(searchOrder) {
		var callback = function(o) {
			$('#VideoEmbedMain').html(o.responseText);
			$('#VideoEmbedUrl').focus();
			VET_updateHeader();

			// macbre: RT #19150
			if ( window.wgEnableAjaxLogin == true && $('#VideoEmbedLoginMsg').exists() ) {
				$('#VideoEmbedLoginMsg').click(openLogin).css('cursor', 'pointer').log('VET: ajax login enabled');
			}

			// Add suggestions and search to VET
			VETExtended.init({
				searchOrder: searchOrder
			});
		};
		$.ajax(
			wgScriptPath + '/index.php?action=ajax&rs=VET&method=loadMain',
			{
				method: 'get',
				complete: callback
			}
		);
		VET_curSourceId = 0;
	}

	/*
	 * note: VET_onVideoEmbedUrlKeypress is called from template
	 */
	function VET_onVideoEmbedUrlKeypress(e) {
		if (e.which == 13){
			e.preventDefault();
			VET_preQuery(null);
			return false;
		}

	}

	/*
	 * note: VET_preQuery is called from a template, and from VET_onVideoEmbedUrlKeypress
	 */
	function VET_preQuery(e) {
		if(!$('#VideoEmbedUrl').val()) {
			GlobalNotification.show( $.msg('vet-warn2'), 'error', null, VET_notificationTimout );
			return false;
		} else {
			var query = $('#VideoEmbedUrl').val();
			VET_sendQueryEmbed( query );
			return false;
		}
	}

	/*
	 * renders the embed screen (aka 2nd screen)
	 */
	function VET_displayDetails(responseText, dataFromEditMode) {
		VET_switchScreen('Details');
		$('#VideoEmbedBack').css('display', 'inline');

		// wlee: responseText could include <script>. Use jQuery to parse
		// and execute this script
		$('#VideoEmbed' + VET_curScreen).html(responseText);
		VET_updateHeader();


		if($('#VideoEmbedThumb').length) {
			VET_orgThumbSize = null;
			var image = $('#VideoEmbedThumb').children(':first');
			var thumbSize = [image.width, image.height];
			VET_orgThumbSize = null;
		}

		var value = VET_thumbSize;

		if (dataFromEditMode) {
			if(dataFromEditMode.width) {
				value = dataFromEditMode.width;
			} else {
				value = '';
			}
		}

		function initSlider() {

			$('.WikiaSlider').slider({
				min: VET_MIN_WIDTH,
				max: VET_MAX_WIDTH,
				value: value,
				slide: function(event, ui) {
					$('#VideoEmbedManualWidth').val(ui.value);
				},
				create: function(event, ui) {
					$('#VideoEmbedManualWidth').val(value);
				}
			});
		}

		// VET uses jquery ui slider, lazy load it if needed
		if (!$.fn.slider) {
			$.when(
				$.getResources([
					wgResourceBasePath + '/resources/jquery.ui/jquery.ui.widget.js',
					wgResourceBasePath + '/resources/jquery.ui/jquery.ui.mouse.js',
					wgResourceBasePath + '/resources/jquery.ui/jquery.ui.slider.js'
				])
			).done(initSlider);
		} else {
			initSlider();
		}

		if ($( '#VET_error_box' ).length) {
			GlobalNotification.show( $( '#VET_error_box' ).html(), 'error', null, VET_notificationTimout );
		}

		if ( $('#VideoEmbedMain').html() == '' ) {
			VET_loadMain();
		}

		$('#VideoEmbedCaption').placeholder();
	}

	function VET_insertFinalVideo(e) {
		VET_tracking({
			label: 'complete'
		});

		e.preventDefault();

		var params = new Array();

		if( !$('#VideoEmbedName').length || $('#VideoEmbedName').val() == '' ) {
	 		GlobalNotification.show( $.msg('vet-warn3'), 'error', null, VET_notificationTimout );
			return false;
		}

		params.push('id='+$('#VideoEmbedId').val());
		params.push('provider='+$('#VideoEmbedProvider').val());

		if( $( '#VideoEmbedMetadata' ).length ) {
			var metadata = new Array();
			metadata = $( '#VideoEmbedMetadata' ).val().split( "," );
			for( var i=0; i < metadata.length; i++ ) {
				params.push( 'metadata' + i  + '=' + metadata[i] );
			}
		}

		params.push('description='+encodeURIComponent($('#VideoEmbedDescription').val()));
		params.push('oname='+encodeURIComponent( $('#VideoEmbedOname').val() ) );
		params.push('name='+encodeURIComponent( $('#VideoEmbedName').val() ) );

		if($('#VideoEmbedThumb').length) {
			params.push('size=' + ($('#VideoEmbedThumbOption').is(':checked') ? 'thumb' : 'full'));
			params.push( 'width=' + $( '#VideoEmbedManualWidth' ).val() );
			if( $('#VideoEmbedLayoutLeft').is(':checked') ) {
				params.push( 'layout=left' );
			} else if( $('#VideoEmbedLayoutGallery').is(':checked') ) {
				params.push( 'layout=gallery' );
			} else if ( $('#VideoEmbedLayoutCenter').is(':checked') ) {
				params.push( 'layout=center' )
			} else {
				params.push( 'layout=right' );
			}
			params.push('caption=' + encodeURIComponent( $('#VideoEmbedCaption').val() ) );
		}

		/* Allow extensions to add extra params to ajax call
		 * So far only used by article placeholders
		 * Making this event driven is tricky because there can be more than 'add video' element on a page.
		 *   ex: MiniEditor and Article Placeholder
		 */
		params = params.concat(VET_options.insertFinalVideoParams || []);

		var callback = function(o, status) {
			if(status == 'error') {
				GlobalNotification.show( $.msg('vet-insert-error'), 'error', null, VET_notificationTimout );
			} else if (status == 'success') {
				var screenType = VET_jqXHR.getResponseHeader('X-screen-type');
				if(typeof screenType == "undefined") {
					screenType = VET_jqXHR.getResponseHeader('X-Screen-Type');
				}
				switch($.trim(screenType)) {
					case 'error':
						o.responseText = o.responseText.replace(/<script.*script>/, "" );
						GlobalNotification.show( o.responseText, 'error', null, VET_notificationTimout );
						break;
					case 'summary':
						VET_switchScreen('Summary');
						$('#VideoEmbedBack').css('display', 'none');
						$('#VideoEmbed' + VET_curScreen).html(o.responseText);
						VET_updateHeader();

						if ( !$( '#VideoEmbedCreate'  ).length && !$( '#VideoEmbedReplace' ).length ) {
							var wikitext = $('#VideoEmbedTag').val();
							var options = {};

							if(wikitext) {
								options.wikitext = wikitext;
							}
							if($('#VideoEmbedThumbOption').is(':checked')) {
								options.thumb = 1;
							} else {
								options.thumb = null;
							}
							if($('#VideoEmbedLayoutLeft').is(':checked')) {
								options.align = 'left';
							} else if ($('#VideoEmbedLayoutCenter').is(':checked')) {
								options.align = 'center';
							} else {
								options.align = null;
							}

							options.caption = $('#VideoEmbedCaption').val();

							options.placeholderIndex = VET_embedPresets.placeholderIndex;

							VET_callbackAfterEmbed(options);
						} else {
							$( '#VideoEmbedSuccess' ).css('display', 'none');
							$( '#VideoEmbedTag' ).css('display', 'none');
							$( '#VideoEmbedPageSuccess' ).css('display', 'block');
						}
						break;
					default:
						break;
				}
			}
		};

		VET_jqXHR.abort();
		VET_jqXHR = $.ajax(
			wgScriptPath + '/index.php?action=ajax&rs=VET&method=insertFinalVideo&' + params.join('&'),
			{
				method: 'get',
				complete: callback
			}
		);
	}

	function VET_switchScreen(to) {
		VET_prevScreen = VET_curScreen;
		VET_curScreen = to;
		$('#VideoEmbedBody').find('.VET_screen').hide();
		$('#VideoEmbed' + VET_curScreen).show();
		VET_updateHeader();

		// this is called in both cases - when hitting 'back' and when closing the dialog.
		// in any case we want to stop the video
		$('#VideoEmbedThumb').children().remove();
		if(VET_curScreen == 'Main') {
			$('#VideoEmbedBack').css('display', 'none');
		}

		// macbre: move back button on Oasis
		if( to == "Details" ) {
			setTimeout(function() {
				VET_moveBackButton($('.VideoEmbedNoBorder.addVideoDetailsFormControls').find('input'));
			}, 50);
		}
	}

	function VET_back(e) {
		e.preventDefault();

		if(VET_curScreen == 'Details') {
			VET_switchScreen('Main');
		} else if(VET_curScreen == 'Conflict' && VET_prevScreen == 'Details') {
			VET_switchScreen('Details');
		}
	}

	function VET_close() {
		VET_switchScreen('Main');
		window.VETbackButton = false;

		VET_tracking({
			label: 'close'
		});

		VET_loader.modal.closeModal();

		// Handle MiniEditor focus
		// (BugId:18713)
		if (window.WikiaEditor) {
			var wikiaEditor = WikiaEditor.getInstance();
			if(wikiaEditor.config.isMiniEditor) {
				wikiaEditor.editorFocus();
				wikiaEditor.plugins.MiniEditor.hasFocus = false;
			}
		}

		UserLogin.refreshIfAfterForceLogin();
	}

	/*
	 * transition from search to embed
	 * todo: rename this function, because it does not only send query to embed
	 */
	function VET_sendQueryEmbed(query) {
		// If callbackAfterSelect returns false, end here. Otherwise, move on to the next screen.
		if(VET_callbackAfterSelect(query) !== false) {
			var callback = function(o) {
				var screenType = VET_jqXHR.getResponseHeader('X-screen-type');
				if(typeof screenType == "undefined") {
					screenType = VET_jqXHR.getResponseHeader('X-Screen-Type');
				}

				if( 'error' == $.trim(screenType) ) {
					GlobalNotification.show( o.responseText, 'error', null, VET_notificationTimout );
				} else {
					// attach handlers - close preview on VET modal close (IE bug fix)
					VETExtended.cachedSelectors.closePreviewBtn.click();
					VET_displayDetails(o.responseText);
				}

			};
			var searchType = VETExtended.searchCachedStuff.searchType;

			VET_jqXHR.abort();
			VET_jqXHR = $.ajax(
				wgScriptPath + '/index.php',
				{
					method: 'post',
					data: 'action=ajax&rs=VET&method=insertVideo&url=' + escape(query) + '&searchType=' + searchType,
					complete: callback
				}
			);
		}
	}

	function VET_updateHeader() {
		var $header = $('#VideoEmbed' + VET_curScreen + ' h1:first');
		$('#VideoEmbedHeader').html($header.html());
		$header.hide();
	}

	//***********************************************
	//
	// New Features to VET - suggestions, search, preview etc.
	//
	// author: Rafal Leszczynski, Jacek Jursza
	//
	//***********************************************

	var VETExtended = {

		canFatch: true, // flag for blocking fetching if it's in progress or no more items to fetch

		// object for caching stuff for suggestions
		suggestionsCachedStuff: {

			cashedSuggestions: [],
			fetchedResoultsCount: 0
		},

		// object for caching stuff for search
		searchCachedStuff: {

			inSearchMode: false,
			currentKeywords: '',
			fetchedResoultsCount: 0,
			searchType: 'premium',
			searchOrder: 'default'
		},

		init: function(searchSettings) {
			var that = this;

			// reset cached stuff on init if some old values preserved
			this.searchCachedStuff.currentKeywords = '';
			this.searchCachedStuff.inSearchMode = false;
			this.suggestionsCachedStuff.cashedSuggestions = [];
			this.suggestionsCachedStuff.fetchedResoultsCount = 0;

			$.extend(this.searchCachedStuff, searchSettings);

			// load mustache as deferred object and then make request for suggestions
			$.when(
				$.loadMustache()
			).done($.proxy(this.fetchSuggestions, this));

			// cache selectors
			this.cachedSelectors = {
				carousel: $('#VET-suggestions'),
				carouselWrapper: $('#VET-carousel-wrapper'),
				suggestionsWrapper: $('#VET-suggestions-wrapper'),
				previewWrapper: $('#VET-preview'),
				videoWrapper: $('#VET-video-wrapper'),
				searchForm: $('#VET-search-form'),
				resultCaption: $('#VET-carousel-wrapper > p.results strong'),
				backToSuggestions: $('#VET-carousel-wrapper > a.back-link'),
				closePreviewBtn: $('#VET-preview-close'),
				positionOptions: $('#VideoEmbedLayoutRow'),
				searchDropDown: $('#VET-search-dropdown')
			};

			// set search type to local if premium disabled
			if (this.cachedSelectors.searchDropDown.attr('data-selected') === 'local') {
				this.searchCachedStuff.searchType = 'local';
			} else {
				this.searchCachedStuff.searchType = 'premium';
			}

			// attach handlers - add video button
			this.cachedSelectors.carousel.on('click', 'li > a', function(event) {
				event.preventDefault();
				VET_sendQueryEmbed($(this).attr('href'));
				VET_tracking({
					label: that.carouselMode === 'search' ? 'add-video' : 'add-video-suggested'
				});
			});

			// attach handlers - play button (open video preview)
			this.cachedSelectors.carousel.on('click', 'li a.video', function(event){
				event.preventDefault();
				var videoTitle = $(".Wikia-video-thumb", this).attr("data-video-key");
				that.fetchVideoPlayer(videoTitle);

				// remove in-preview class from previously check item if exists
				that.removeInPreview();

				// cache current in preview element in carousel
				that.cachedSelectors.inPreview = $(this).parents('li').addClass('in-preview');
			});

			// attach handlers - close preview
			this.cachedSelectors.previewWrapper.on('click', '#VET-preview-close', function(event) {
				event.preventDefault();
				that.cachedSelectors.previewWrapper.stop().slideUp('slow', function() {
					that.cachedSelectors.videoWrapper.children().remove();
					that.removeInPreview();
				});
			});

			// attach handlers - add video button from preview
			this.cachedSelectors.previewWrapper.on('click', '#VET-add-from-preview', function(event) {
				event.preventDefault();
				that.cachedSelectors.inPreview.children('a').click();
			});

			// attach handlers - back to suggestions
			this.cachedSelectors.backToSuggestions.on('click', function(e) {

	            that.searchCachedStuff.inSearchMode = false;

	            if(that.requestInProgress) {
	                that.requestInProgress.abort();
	            }
	            that.searchCachedStuff.currentKeywords = '';
	            that.cachedSelectors.backToSuggestions.removeClass('show');
	            that.cachedSelectors.carousel.find('p').removeClass('show');
	            that.updateResultCaption();
				that.cachedSelectors.closePreviewBtn.click();
	            that.cachedSelectors.carousel.find('li').remove();
	            that.addSuggestions({items: that.suggestionsCachedStuff.cashedSuggestions});
	            if (that.cachedSelectors.carousel.resetPosition) that.cachedSelectors.carousel.resetPosition();

	            that.isCarouselCheck();
			});

			// attach handlers - search
			this.cachedSelectors.searchForm.submit(function(event) {
				event.preventDefault();
				var keywords = $(this).find('#VET-search-field').val();
				if(keywords !== '' && that.searchCachedStuff.currentKeywords !== keywords) {

					// switch fetch more handler to fetch search mode;
					that.searchCachedStuff.inSearchMode = true;

					// stop proccesing previous fetching request (exp. using search when still loading suggestions on init)
					if(that.requestInProgress) {
						that.requestInProgress.abort();
					}

					// reset cached properties for new search query
					that.searchCachedStuff.fetchedResoultsCount = 0;
					that.searchCachedStuff.currentKeywords = keywords;
					that.canFatch = true;

					// cleanup carousel if new search phrase
					that.cachedSelectors.closePreviewBtn.click();
					that.cachedSelectors.carousel.find('li').remove();
					that.cachedSelectors.carousel.find('p').removeClass('show');

					that.cachedSelectors.suggestionsWrapper.startThrobbing();

					that.fetchSearch();

					VET_tracking({
						label: that.searchCachedStuff.searchType === 'local' ? 'find-local' : 'find-wikia-library'
					});
				}
			});

			// attach handlers - selection border around position options in video display options tab
			$('#VideoEmbedDetails').on('click', '#VideoEmbedLayoutRow span, #VideoEmbedSizeRow span', function() {

				var parent = $(this).parent();
				parent.find('span').removeClass('selected');
				$(this).addClass('selected');

				// show/hide caption input for "Style" option
				if ($(this).is('#VET_StyleThumb')) {
					parent.children('p').removeClass('show');
					parent.children('input').addClass('show');
				} else {
					parent.children('input').removeClass('show');
					parent.children('p').addClass('show');
				}
			});

			// attach handler - submit display options tab
			$('#VideoEmbedDetails').on('submit', '#VET-display-options', function(event) {
				event.preventDefault();
				VET_insertFinalVideo(event, 'details');
			});
			$('#VideoEmbedDetails').on('submit', '#VET-display-options-update', function(event) {
				event.preventDefault();

				VET_tracking({
					label: 'button-update-video'
				});

				VET_doEditVideo();
			});

			// create dropdown for search filters
			this.cachedSelectors.searchDropDown.wikiaDropdown({
				onChange: function(e, $target) {
					var currSort = this.$selectedItemsList.text(),
						newSort = $target.text();

					if(currSort != newSort) {
						var sort = $target.data('sort');
						that.searchCachedStuff.searchType = sort;
						that.searchCachedStuff.currentKeywords = '';
						that.cachedSelectors.closePreviewBtn.click();
						$('#VET-search-submit').click();
					}
				}
			});
		},

		// METHOD: Remove selected state from in-preview thumbnail
		removeInPreview: function() {

			if (this.cachedSelectors.inPreview) {
				this.cachedSelectors.inPreview.removeClass('in-preview');
			}

		},

		// METHOD: Trim titles
		trimTitles: function(data) {

			var item;

			// trim video titles to two lines
			for ( var i in data.items ) {
				item = data.items[i];
				if (item.title) {
					item.trimTitle = item.title.substr(0, 35);
					if ( item.trimTitle.length < item.title.length ) {
						item.trimTitle += "...";
					}
				}
			}

		},

		// METHOD: add items to carousel
		addSuggestions: function(data) {

			var html,
				template = '{{#items}}<li><figure>{{{thumbnail}}}<figcaption><strong>{{trimTitle}}</strong></figcaption></figure><a href="{{url}}" title="{{title}}">Add video</a></li>{{/items}}';

			html = $.mustache(template, data);
			this.cachedSelectors.carousel.find('ul').append(html);

		},

		// METHOD: create carousel instance
		createCarousel: function() {

			var that = this,
				itemsShown = 5; // items displayed per carousel slide

			// show carousel if suggestions returned
			this.cachedSelectors.carouselWrapper.addClass('show');

			// create carousel instance
			this.carouselInstance = this.cachedSelectors.carousel.carousel({
				transitionSpeed: 500,
				itemsShown: itemsShown,
				nextClass: "scrollright",
				prevClass: "scrollleft",
				trackProgress: function(indexStart, indexEnd, totalItems) {
					if (itemsShown * 2 > totalItems - indexEnd) {
						// depends on fetch mode send request to different controller
						if (!that.searchCachedStuff.inSearchMode) {
							that.fetchSuggestions();
						} else {
							that.fetchSearch();
						}
					}
				}
			});

		},

		// METHOD: Update carousel after adding new items
		updateCarousel: function() {
			this.carouselInstance.updateCarouselItems();
			this.carouselInstance.updateCarouselWidth();
			this.carouselInstance.updateCarouselArrows();
		},

		// METHOD: update carousel after adding new items or create one if not already created
		isCarouselCheck: function() {

			if (this.cachedSelectors.carouselWrapper.hasClass('show')) {
				this.updateCarousel();
			} else {
				this.createCarousel();
			}

		},


		// METHOD: show preview of the selected video
		showVideoPreview: function(data) {
			var previewWrapper = this.cachedSelectors.previewWrapper,
				videoWrapper = this.cachedSelectors.videoWrapper;
			if ( data.playerAsset && data.playerAsset.length > 0 ) { // screenplay special case
				$.getScript(data.playerAsset, function() {
					videoWrapper.html( '<div id="'+data.videoEmbedCode.id+'" class="Wikia-video-enabledEmbedCode"></div>');
					$('body').append('<script>' + data.videoEmbedCode.script + ' loadJWPlayer(); </script>');
				});
			} else {
				videoWrapper.html('<div class="Wikia-video-enabledEmbedCode">'+data.videoEmbedCode+'</div>');
			}

			// expand preview is hidden
			if (!previewWrapper.is(':visible')) {
				previewWrapper.stop().slideDown('slow');
			}

		},

		// METHOD: fech player embed code
		fetchVideoPlayer: function(title) {

			var that = this;

			$.nirvana.sendRequest({
				controller: 'VideoEmbedToolController',
				method: 'getEmbedCode',
				type: 'get',
				data: {
					fileTitle: title
				},
				callback: function(data) {
					that.showVideoPreview(data);

					// video play tracking
					Wikia.Tracker.track({
						action: Wikia.Tracker.ACTIONS.VIEW,
						category: 'Lightbox',	// yeah, Lightbox so we can roll up all the data
						label: 'video-inline',
						title: title,
						provider: data.providerName,
						clickSource: (that.carouselMode === 'suggestion' ? 'VET-Suggestion' : 'VET-Search'),
						trackingMethod: 'internal'
					});
				}
			});

		},

		// METHOD: update caption
		updateResultCaption: function( txt ) {
		      if (!this.cachedResultCaption) this.cachedResultCaption = this.cachedSelectors.resultCaption.text();
		      if ( txt ) this.cachedSelectors.resultCaption.text( txt );
		      else this.cachedSelectors.resultCaption.text( this.cachedResultCaption );
		},

		// METHOD: fetch part of suggestions
		fetchSuggestions: function() {

			var that = this,
				svStart = this.suggestionsCachedStuff.fetchedResoultsCount, // index - start fetching from item number...
				svSize = 20; // number of requested items

			if (this.canFatch === true) {
				this.canFatch = false; // fetching in progress

				this.carouselMode = 'suggestion';

				this.requestInProgress = $.nirvana.sendRequest({
					controller: 'VideoEmbedToolController',
					method: 'getSuggestedVideos',
					type: 'get',
					data: {
						svStart: svStart,
						svSize: svSize,
						articleId: wgArticleId
					},
					callback: function(data) {
						var i,
							items = data.items,
							length = items.length;

						if (length > 0) {

							that.trimTitles(data);
							that.addSuggestions(data);

							// update results counter
							that.suggestionsCachedStuff.fetchedResoultsCount = data.nextStartFrom;

							// cache fetched items
							for (i = 0; i < length; i += 1) {
								that.suggestionsCachedStuff.cashedSuggestions.push(items[i]);
							}

							that.isCarouselCheck();
							that.canFatch = true;
						}
					}
				});
			}

		},

		// METHOD: fetch part of search results
		fetchSearch: function() {

			var that = this,
				svStart = this.searchCachedStuff.fetchedResoultsCount,
				svSize = 20; // number of requested items
				phrase = this.searchCachedStuff.currentKeywords;

			if (this.canFatch === true) {
				this.canFatch = false; // fetching in progress

				this.carouselMode = 'search';

				this.requestInProgress = $.nirvana.sendRequest({
					controller: 'VideoEmbedToolController',
					method: 'search',
					type: 'get',
					data: {
						svStart: svStart,
						svSize: svSize,
						phrase: phrase,
						type: that.searchCachedStuff.searchType,
						order: that.searchCachedStuff.searchOrder
					},
					callback: function(data) {

						var i,
							items = data.items,
							length = items.length;

						// show results count
						that.updateResultCaption( data.caption );

						if (length > 0) {

							// update results counter
							that.searchCachedStuff.fetchedResoultsCount = data.nextStartFrom;

							that.trimTitles(data);
							that.addSuggestions(data);

							// reset carousel container to the first slide position
							if (svStart === 0) {
								if (that.cachedSelectors.carousel.resetPosition) that.cachedSelectors.carousel.resetPosition();
							}

						} else if (that.searchCachedStuff.fetchedResoultsCount === 0) {
							// show no results found for new search with not results returned from controller
							that.cachedSelectors.carousel.find('p').addClass('show');
						}

						if (that.suggestionsCachedStuff.cashedSuggestions.length > 0)
							that.cachedSelectors.backToSuggestions.addClass('show');

						that.isCarouselCheck();
						that.canFatch = true;
						that.cachedSelectors.suggestionsWrapper.stopThrobbing();

					}
				});
			}

		}

	};


	// event handlers taken from inline js.  TODO: integrate these better with rest of code
	$(document)
		.on('click.VET', '#VideoEmbedLayoutLeft, #VideoEmbedLayoutCenter, #VideoEmbedLayoutRight, #VideoEmbedLayoutGallery', function(e) {
			var toggleTo = true;
			if($(e.target).is('#VideoEmbedLayoutGallery')) {
				toggleTo = false;
			}
			VET_toggleSizing(toggleTo);
		})
		.on('change.VET, keyup.VET', '#VideoEmbedManualWidth', VET_manualWidthInput)
		.on('keypress.VET', '#VideoEmbedUrl', VET_onVideoEmbedUrlKeypress)
		.on('click.VET', '#VideoEmbedUrlSubmit', VET_preQuery)
		.on('click.VET', '#VideoEmbedRenameButton, #VideoEmbedExistingButton, #VideoEmbedOverwriteButton', VET_insertFinalVideo)
		.on('click.VET', '.vet-close', function(e) {
			e.preventDefault();

			VET_tracking({
				label: 'success-button-return'
			});

			VET_close();
		});


	// globally available functions
	// TODO: Create VET namespace for these
	window.VET_show = VET_show;
	window.VET_close = VET_close;
	window.VETExtended = VETExtended;
})(jQuery, window);
