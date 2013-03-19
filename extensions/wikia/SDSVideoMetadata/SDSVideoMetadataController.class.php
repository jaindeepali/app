<?php
/**
 * @author ADi
 * @author Jacek Jursza
 */

class SDSVideoMetadataController extends WikiaSpecialPageController {

	// Flash player width
	const VIDEO_WIDTH = 500;

	public function __construct() {
		parent::__construct('VMD');
	}

	public function indexTest() {

		$file = $this->getVal('video');

		$formBuilder = new PandoraForms( $file );
		$this->setVal( 'form', $formBuilder );

		if($this->request->wasPosted()) {

			$requestParams = $this->getRequest()->getParams();
			$formBuilder->save( $requestParams );

		}

	}

	public function index() {

		$this->response->addAsset('extensions/wikia/SDSVideoMetadata/css/VideoMetadata.scss');
		$this->response->addAsset('extensions/wikia/SDSVideoMetadata/js/VideoMetadata.js');
		$file = $this->getVal('video');

		$fileTitle = Title::newFromText( $file );
		$fileObject = wfFindFile( $fileTitle );
		$fileId = Pandora::pandoraIdFromShortId( $fileTitle->getArticleID() );

		if ( empty( $fileObject ) || !WikiaFileHelper::isFileTypeVideo( $fileObject ) ) {
			$this->setVal( 'isCorrectFile', false );
			return false;
		} else {

			$videoEmbedCode = $fileObject->getEmbedCode( self::VIDEO_WIDTH );
			$this->setVal( 'embedCode', $videoEmbedCode );

			$orm = PandoraORM::buildFromField( $fileId, 'schema:additionalType' );
			if ( $orm->exist ) {
				$config = $orm->getConfig();
				foreach ( $config as $key => $params ) {
					$loadedValue = $orm->get( $key );
					if ( $loadedValue === null ) {
						//skip if no value
						continue;
					}
					if ( is_array( $loadedValue ) ) {
						foreach ( $loadedValue as $val ) {
							if ( $val instanceof PandoraORM ) {
								$value = array( 'name' => $val->get( 'name' ), 'id' => $val->getId() );
							} else {
								$value = $val;
							}
							if ( $params[ 'type' ] === PandoraSDSObject::TYPE_COLLECTION ) {
								$mapper[ $key ][] = $value;
							} else {
								$mapper[ $key ] = $value;
							}
						}
					} else {
						if ( $loadedValue instanceof PandoraORM ) {
							$value = array( 'name' => $loadedValue->get( 'name' ), 'id' => $loadedValue->getId() );
						} else {
							$value = $loadedValue;
						}
						if ( $params[ 'type' ] === PandoraSDSObject::TYPE_COLLECTION ) {
							$mapper[ $key ][] = $value;
						} else {
							$mapper[ $key ] = $value;
						}
					}
				}
				$mapper[ 'vcType' ] = get_class( $orm );
				$this->setVal( 'vcObj', $mapper );
			}

			if($this->request->wasPosted()) {
				$this->setVal( 'wasPasted', true );
				$isCompleted = (bool) $this->request->getVal('vcCompleted', false);
				$this->setFileCompleted( $fileTitle, $isCompleted );

				$requestParams = $this->getRequest()->getParams();

				$connectorClassName = $requestParams['vcType'];

				if ( !empty( $connectorClassName ) && class_exists( $connectorClassName ) ) {
					if ( !$orm->exist ) {
						$orm = new $connectorClassName( $fileId );
					}
					foreach ( $orm->getConfig() as $key => $params ) {
						//TODO: delete this hack, after format changed
						if ( isset( $params[ 'childType' ] ) ) {
							foreach ( $requestParams[ $key ] as $data ) {
								$changedParams[] = array( 'name' => $data );
							}
							$requestParams[ $key ] = $changedParams;
						}
						if ( isset( $params[ 'value' ] ) ) {
							$orm->set( $key, $params[ 'value' ] );
						}
					elseif ( isset( $requestParams[ $key ] ) ) {
							if ( is_array( $requestParams[ $key ] ) ) {
								foreach ( $requestParams[ $key ] as $values ) {
									$orm->set( $key, $values );
								}
							} else {
								$orm->set( $key, $requestParams[ $key ] );
							}
						}
					}
					//add name as video object name
					$orm->set( 'videoObject_name', $fileTitle->getBaseText() );
					$result = $orm->save();

					if ( !$result->isOK() ) {
						$this->setVal( 'errorMessage', $result->getMessage() );
					} else {
						//TODO: redirect
						$specialPageUrl = SpecialPage::getTitleFor( 'VMD' )->getFullUrl() . '?video='.urlencode( $fileTitle->getPrefixedDBkey() );
						$this->wg->out->redirect( $specialPageUrl );
//						$this->setVal( 'success', true );
					}
				}
			}

			$this->setVal( 'isCorrectFile', true );
			$this->setVal( 'isCompleted', $this->getFileCompleted( $fileTitle ) );
		}

		$this->setVal('file', $file);
	}

	/**
	 * set "completed" flag for given file
	 *
	 * @todo move this to model class when it will be ready
	 *
	 * @param Title $fileTitle
	 * @param bool $isCompleted
	 */
	private function setFileCompleted(Title $fileTitle, $isCompleted = true) {
		wfSetWikiaPageProp( WPP_VIDEO_METADATA_COMPLETED, $fileTitle->getArticleID(), $isCompleted );
	}

	/**
	 * get "completed" flag for given file
	 *
	 * @todo move this to model class when it will be ready
	 *
	 * @param Title $fileTitle
	 */
	private function getFileCompleted(Title $fileTitle) {
		return wfGetWikiaPageProp( WPP_VIDEO_METADATA_COMPLETED, $fileTitle->getArticleID() );
	}

}
