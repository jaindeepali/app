CREATE TABLE video_notmigrated (
	id INT(11) NOT NULL AUTO_INCREMENT,
	wiki_id INT(11) NOT NULL,
	wiki_name VARCHAR(255) NOT NULL,
	video_count INT(11) NOT NULL,
	KEY `vnm_wikiid` (wiki_id),
	KEY `vnm_wikiname` (wiki_name),
	PRIMARY KEY (id)
) ENGINE=InnoDB;
