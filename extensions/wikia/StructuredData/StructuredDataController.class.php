<?php
/**
 * @author ADi
 */

class StructuredDataController extends WikiaSpecialPageController {

	protected $config = null;
	/**
	 * @var StructuredDataAPIClient
	 */
	protected $APIClient = null;

	public function __construct() {
		// parent SpecialPage constructor call MUST be done
		parent::__construct( 'StructuredData', '', false );

	}

	public function init() {
		$this->config = $this->wg->StructuredDataConfig;
		$this->APIClient = F::build( 'StructuredDataAPIClient', array( 'endpoint' => $this->config['endpointUrl'], 'schemaUrl' => $this->config['schemaUrl'] ) );
	}

	public function index() {
		$this->wg->Out->addHTML( F::build('JSSnippets')->addToStack( array( "/extensions/wikia/StructuredData/js/StructuredData.js" ) ) );

		//$this->response->addAsset('extensions/wikia/StructuredData/css/StructuredData.scss');
	}

	public function getObject() {
		// force json format
		$this->getResponse()->setFormat( 'json' );

		$id = $this->request->getVal( 'id', false );

		if(!empty($id)) {
			$object = $this->APIClient->getObject( $id );

			$this->response->setBody( $object );
		}
	}

	public function getCollection() {

	}
}