TYPE=TRIGGERS
triggers='CREATE DEFINER=`marcion`@`localhost` trigger `ikeyadd` after insert on `library_index`\nfor each row begin\n  update `library` set `i_key`=new.`key` where `book`=new.`book` and `chapter`=new.`chapter` and `verse`=new.`verse`;\nend' 'CREATE DEFINER=`marcion`@`localhost` trigger `ikeydel` after delete on `library_index`\nfor each row begin\n  if @libexists then\n    update `library` set `i_key`=null where `i_key`=old.`key`;\n  end if;\nend'
sql_modes=0 0
definers='marcion@localhost' 'marcion@localhost'
client_cs_names='utf8' 'utf8'
connection_cl_names='utf8_general_ci' 'utf8_general_ci'
db_cl_names='latin1_swedish_ci' 'latin1_swedish_ci'
