<?php
/**
 * @author Sean Colombo
 * @date 20120501
 *
 * Extension which helps with running A/B tests or Split Tests (can actually be a/b/c/d/etc. as needed).
 *
 * This is the new system which is powered by our data warehouse.
 */

if ( !defined( 'MEDIAWIKI' ) ) {
	echo "This file is part of MediaWiki, it is not a valid entry point.\n";
	exit( 1 );
}

$app = F::app();
$dir = dirname( __FILE__ );

/**
 * info
 */
$app->wg->append(
	'wgExtensionCredits',
	array(
		'name' => 'A/B Testing',
		'author' => array(
			'[http://www.seancolombo.com Sean Colombo]',
			'Władysław Bodzek',
			'Kyle Florence',
			'Piotr Bablok'
		),
		'descriptionmsg' => 'abtesting-desc',
		'version' => '1.0',
	),
	'other'
);

/**
 * classes
 */
$app->registerClass('AbTesting',"{$dir}/AbTesting.class.php");
$app->registerClass('AbExperiment',"{$dir}/AbTesting.class.php");
$app->registerClass('AbTestingData',"{$dir}/AbTestingData.class.php");
$app->registerClass('ResourceLoaderAbTestingModule',"{$dir}/ResourceLoaderAbTestingModule.class.php");
$app->registerClass('SpecialAbTestingController',"{$dir}/SpecialAbTestingController.class.php");

/**
 * message files
 */
$app->wg->set( 'wgExtensionMessagesFiles', "{$dir}/AbTesting.i18n.php", 'AbTesting' );

// Embed the experiment/treatment config in the head scripts.
$app->registerHook( 'WikiaSkinTopScripts', 'AbTesting', 'onWikiaSkinTopScripts' );
// Add js code in Oasis
$app->registerHook( 'OasisSkinAssetGroupsBlocking', 'AbTesting', 'onOasisSkinAssetGroupsBlocking' );

// Register Resource Loader module
$app->wg->set( 'wgResourceModules', array(
	'class' => 'ResourceLoaderAbTestingModule',
), 'wikia.ext.abtesting' );

$app->wg->set( 'wgResourceModules', array(
	'styles' => array(
		'extensions/wikia/AbTesting/css/AbTestEditor.scss',
		'resources/jquery.ui/themes/default/jquery.ui.core.css',
		'resources/jquery.ui/themes/default/jquery.ui.datepicker.css',
		'resources/jquery.ui/themes/default/jquery.ui.slider.css',
		'resources/jquery.ui/themes/default/jquery.ui.theme.css',
		'resources/wikia/libraries/jquery-ui/themes/default/jquery.ui.timepicker.css',
	),
), 'wikia.ext.abtesting.edit.styles' );

$app->wg->set( 'wgResourceModules', array(
	'scripts' => array(
		'extensions/wikia/AbTesting/js/AbTestEditor.js',
		'resources/jquery.ui/jquery.ui.core.js',
		'resources/jquery.ui/jquery.ui.widget.js',
		'resources/jquery.ui/jquery.ui.datepicker.js',
		'resources/jquery.ui/jquery.ui.mouse.js',
		'resources/jquery.ui/jquery.ui.slider.js',
		'resources/wikia/libraries/jquery-ui/jquery.ui.timepicker.js',
	),
	'messages' => array(
		'abtesting-add-experiment-title',
		'abtesting-edit-experiment-title'
	)
), 'wikia.ext.abtesting.edit' );

//AbTesting is an Oasis-only experiment for now
//$app->registerHook( 'WikiaMobileAssetsPackages', 'AbTesting', 'onWikiaMobileAssetsPackages' );

$app->registerSpecialPage('AbTesting', 'SpecialAbTestingController');


/*
 * permissions setup
 */
$wgGroupPermissions['*']['abtestpanel'] = false;
$wgGroupPermissions['staff']['abtestpanel'] = true;
