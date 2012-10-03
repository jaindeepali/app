<?php
/**
 * Wikia Search (v3) Extension
 *
 * @author Robert Elwell <robert(at)wikia-inc.com>
 * @author Adrian 'ADi' Wieczorek <adi(at)wikia.com>
 *
 */


$app = F::app();
$dir = dirname(__FILE__) . '/';

require( 'Solarium/Autoloader.php' );
Solarium_Autoloader::register();

/**
 * classes
 */
$app->registerClass('WikiaSearch', 					$dir . 'WikiaSearch.class.php');
$app->registerClass('WikiaSearchIndexer', 			$dir . 'WikiaSearchIndexer.class.php');
$app->registerClass('WikiaSearchConfig', 			$dir . 'WikiaSearchConfig.class.php');
$app->registerClass('WikiaSearchController', 		$dir . 'WikiaSearchController.class.php');
$app->registerClass('WikiaSearchResult', 			$dir . 'WikiaSearchResult.class.php');
$app->registerClass('WikiaSearchResultSet', 		$dir . 'WikiaSearchResultSet.class.php');
$app->registerClass('WikiaSearchArticleMatch',		$dir . 'WikiaSearchArticleMatch.class.php');
$app->registerClass('WikiaSearchAjaxController',	$dir . 'WikiaSearchAjaxController.class.php');

/**
 * special pages
 */
$app->registerSpecialPage('WikiaSearch',	'WikiaSearchController');
$app->registerSpecialPage('Search',			'WikiaSearchController');

global $wgSolrProxy, $wgSolrHost, $wgWikiaSearchUseProxy;

$wgSolrHost = isset($_GET['solrhost']) ? $_GET['solrhost'] : $wgSolrHost;

if (isset($_GET['solrhost']) || isset($_GET['solrport'])) {
     $wgSolrPort = isset($_GET['solrport']) ? $_GET['solrport'] : 8983;

     $wgWikiaSearchUseProxy = false;
}

$solariumConfig = array(
		'adapteroptions'	=> array(
			'host' => ( !empty( $wgSolrHost ) ? $wgSolrHost : 'localhost'),
			'port' => ( !empty( $wgSolrPort ) ? $wgSolrPort : 8180 ),
			'path' => '/solr/',
		)
);

if ($wgWikiaSearchUseProxy && isset($wgSolrProxy)) {
	$solariumConfig['adapteroptions']['proxy'] = $wgSolrProxy;
	$solariumConfig['adapteroptions']['port'] = null;
}

F::addClassConstructor( 'Solarium_Client', array( 'solariumConfig' => $solariumConfig ) );


F::addClassConstructor( 'WikiaSearch', array( 'client' => F::build('Solarium_Client') ) );

/**
 * message files
 */
$app->registerExtensionMessageFile('WikiaSearch', $dir . 'WikiaSearch.i18n.php' );

/**
 * preference settings
 */
$app->registerHook('GetPreferences', 'WikiaSearch', 'onGetPreferences');

/*
 * hooks
 */
$app->registerHook('WikiaMobileAssetsPackages', 'WikiaSearchController', 'onWikiaMobileAssetsPackages');

$wgExtensionCredits['other'][] = array(
	'name'				=> 'Wikia Search',
	'version'			=> '3.0',
	'author'			=> '[http://www.wikia.com/wiki/User:Adi3ek Adrian \'ADi\' Wieczorek], [http://wikia.com/wiki/User:Relwell Robert Elwell]',
	'descriptionmsg'	=> 'wikia-search-desc',
);
