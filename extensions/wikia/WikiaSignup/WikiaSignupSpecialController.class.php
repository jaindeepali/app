<?php

/**
 * WikiaSignup Special Page
 * @author Hyun
 * @author Saipetch
 *
 */
class WikiaSignupSpecialController extends WikiaSpecialPageController {

	public function __construct() {
		wfLoadExtensionMessages('WikiaSignup');
		parent::__construct('WikiaSignup', '', false);
	}
	
	public function init() {
		$this->response->addAsset('extensions/wikia/WikiaSignup/js/WikiaSignup.js');
	}
	
	public function index() {
		
	}
	
}
