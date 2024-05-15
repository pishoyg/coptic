TYPE=TRIGGERS
triggers='CREATE DEFINER=`marcion`@`localhost` trigger `iarchdel` after delete on `library_archive`\nfor each row begin\n    delete from `library_data` where `id`=old.`data_id` and `type`=1;\n    delete from `library_mindex` where `archive_id`=old.`id`;\nend'
sql_modes=0
definers='marcion@localhost'
client_cs_names='utf8'
connection_cl_names='utf8_general_ci'
db_cl_names='latin1_swedish_ci'
