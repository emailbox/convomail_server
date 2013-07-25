-- phpMyAdmin SQL Dump
-- version 3.3.7deb3build0.10.10.1
-- http://www.phpmyadmin.net
--
-- Host: testdbinstance.cy7pf42lukt9.us-west-1.rds.amazonaws.com:3306
-- Generation Time: Jul 21, 2013 at 07:40 AM
-- Server version: 5.1.63
-- PHP Version: 5.3.3-1ubuntu9.10

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";

--
-- Database: `emailbox_minimail`
--

-- --------------------------------------------------------

--
-- Table structure for table `f_emails`
--

CREATE TABLE IF NOT EXISTS `f_emails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `email_id` varchar(255) NOT NULL,
  `thread_id` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL COMMENT 'access code to pay for services',
  `paid` tinyint(1) NOT NULL DEFAULT '0',
  `services` text NOT NULL,
  `created` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`,`email_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Table structure for table `f_users`
--

CREATE TABLE IF NOT EXISTS `f_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `emailbox_id` varchar(255) NOT NULL,
  `access_token` text NOT NULL,
  `android_reg_id` varchar(255) NOT NULL,
  `created` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `emailbox_id` (`emailbox_id`),
  KEY `user_token` (`access_token`(255))
) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=8502 ;
