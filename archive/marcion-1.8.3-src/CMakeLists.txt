cmake_minimum_required(VERSION 2.8)
project (Marcion)

set(M_EXTRA_DJVULIBRE_INC "" CACHE PATH "djvulibre headers path")
set(M_EXTRA_DJVULIBRE_LIB "" CACHE PATH "djvulibre library")
set(M_EXTRA_MYSQL_INC "/usr/local/mysql/include" CACHE PATH "mysql include path")
set(M_EXTRA_MYSQLD_LIB "/usr/local/mysql/lib" CACHE PATH "mysqld library")
set(M_MYSQL_CONFIG_COMMAND "/usr/local/mysql/bin/mysql_config" CACHE FILEPATH "mysql_config command")
set(M_EXTRA_POPPLER_INC "" CACHE PATH "poppler include path")
set(M_EXTRA_POPPLER_QT4_LIB "" CACHE PATH "poppler-qt4 library")
set(M_EXTRA_ARCHIVE_INC "" CACHE PATH "libarchive include path")
set(M_EXTRA_ARCHIVE_LIB "" CACHE PATH "libarchive library")
set(M_APP_DATA "${CMAKE_SOURCE_DIR}/marcion-data" CACHE PATH "marcion data path")
set(M_PDF ON CACHE BOOL "determines whether the Pdf viewer based on the Poppler library will be built or not")
set(M_INSTALL_DATA ON CACHE BOOL "determines, whether the application data will be checked and installed (including MySql 'share' folder)")
set(M_MYSQLDLIB_CHECK ON CACHE BOOL "determines, whether presence of mysqld library will be tested")

set(M_MYSQLD_LINKER_FLAGS "" CACHE STRING "additional linker flags for mysqld (example: -llib1 -llib2 -lanotherlib)")

message(STATUS "target platform: ${CMAKE_SYSTEM}")


include_directories("${CMAKE_SOURCE_DIR}/ibycus" "${CMAKE_SOURCE_DIR}/djview410")

INCLUDE(CheckIncludeFile)
INCLUDE(CheckLibraryExists)

if(WIN32)
	add_definitions(-D__LCC__)
endif(WIN32)

FIND_PACKAGE(Qt4 "4.8" COMPONENTS QtCore QtGui QtNetwork QtXml QtWebKit REQUIRED)

message(STATUS "qt4 found - ${QT_QMAKE_EXECUTABLE}")

include_directories("${QT_HEADERS_DIR}")
include_directories("${QT_QTCORE_INCLUDE_DIR}")
include_directories("${QT_QTGUI_INCLUDE_DIR}")
include_directories("${QT_QTXML_INCLUDE_DIR}")
include_directories("${QT_QTNETWORK_INCLUDE_DIR}")
include_directories("${QT_QTWEBKIT_INCLUDE_DIR}")

link_directories("${QT_LIBRARY_DIR}")

set(UI_FILES
"crumwidget"
"messages"
"librarywidget"
"booktextbrowser"
"lsj"
"wordpreview"
"libsearchresult"
"latcopt"
"librarysearch"
"settings"
"grammar"
"searchcriteria2"
"addword"
"tlgselector2"
"mainwnd"
"reorder"
"textcolorchooser"
"aboutdialog"
"marckeyb"
"licensedialog"
"progressdialog"
"tbldesigner"
"htmlindexdialog"
"htmlreader"
"intlintr"
"translat"
"copinttr"
"translitem"
"exporttr"
"bookedit"
"regexpbuilder"
"mlibtitle"
"mexecsql"
"filechooser"
"mmsgtitle"
"mdownloadweb"
"mindexdir2"
"mlibsearchtitle"
"msetttitle"
"mbuildconfig"
"mhistory"
"meditimgitem"
"mreorderimageitem"
"mimagewidget"
"mnewindexdir"
"mlibrarybranches"
"marchiveitem"
"mchoosecategory"
"mdroparchive"
"marchiver"
"mcreatearchive"
"msetarchivedata"
"msessiondialog"
"mtcplistenwidget"
"mremaptgz"
"mcopticnumerals"
"mrenamedialog"
"mcontentbook"
"mspiniter"
"msimulitem"
"mversedbook"
"marchivewidget"
"mvbooksbw"
"mdocheader"
"mdjvureader2"
"mimagebookreader"
"mwindowswidget"
"mopenbooktitle"
"mnotepad"
"msbeditwdg"
"mfontchooser"
"mexportarchive"
"mtipofthewiseman"
"dialects3"
"mnavwnd"
"mmaps"
"mpdfsbwdg"
"mpdfreader2"
"mhebrdict")
set(MOC_FILES
"latcopt"
"settings"
"lsj"
"wordpreview"
"addword"
"searchcriteria2"
"grammar"
"crumwidget"
"dialects3"
"booktextbrowser"
"librarywidget"
"tlgselector2"
"bookreader"
"librarysearch"
"libsearchresult"
"reorder"
"messages"
"mimage"
"mainwnd"
"textcolorchooser"
"textbrowserext"
"aboutdialog"
"marckeyb"
"licensedialog"
"progressdialog"
"tbldesigner"
"htmlindexdialog"
"htmlreader"
"intlintr"
"translat"
"copinttr"
"translitem"
"exporttr"
"translbook"
"treecombobox"
"bookedit"
"regexpbuilder"
"mlibtitle"
"mexecsql"
"filechooser"
"mmsgtitle"
"mdownloadweb"
"mindexdir2"
"mlibsearchtitle"
"msetttitle"
"cmsgbrowser"
"mbuildconfig"
"mhistory"
"meditimgitem"
"mreorderimageitem"
"mimagewidget"
"mnewindexdir"
"mlibrarybranches"
"marchiveitem"
"mchoosecategory"
"mdroparchive"
"marchiver"
"mcreatearchive"
"msetarchivedata"
"mlibtreewidget"
"mtcpserver"
"msessiondialog"
"mtcplistenwidget"
"mremaptgz"
"mcopticnumerals"
"mprogressicon"
"mrenamedialog"
"mcontentbook"
"mspiniter"
"msimulitem"
"mversedbook"
"marchivewidget"
"mvbooksbw"
"mdocheader"
"mdjvureader2"
"mimagebookreader"
"mwindowswidget"
"mopenbooktitle"
"mnotepad"
"msbeditwdg"
"mfontchooser"
"mexportarchive"
"mtipofthewiseman"
"mnavwnd"
"mmaps"
"mpdfsbwdg"
"mpdfreader2"
"mhebrdict")
set(RC_FILES
"resfile"
"splash")

macro(make_qt_file FTYPE QTCOMMAND WORKDIR OLDAPP NEWPREP NEWAPP)
  message(STATUS "generating .${NEWAPP} files ...")
  foreach(${FTYPE}_FILE IN LISTS ${FTYPE}_FILES)
    message(STATUS "executing ${QTCOMMAND} ${${FTYPE}_FILE}.${OLDAPP} -o ${NEWPREP}${${FTYPE}_FILE}.${NEWAPP}")
    execute_process(COMMAND "${QTCOMMAND}" "${${FTYPE}_FILE}.${OLDAPP}" "-o" "${NEWPREP}${${FTYPE}_FILE}.${NEWAPP}" WORKING_DIRECTORY "${WORKDIR}" RESULT_VARIABLE ${FTYPE}_FILES_RESULT ERROR_VARIABLE ${FTYPE}_FILES_ERR)
    if(NOT ${FTYPE}_FILES_RESULT EQUAL "0")
      message(FATAL_ERROR "processing of ${${FTYPE}_FILE}.ui failed. ${${FTYPE}_FILES_ERR}")
    endif(NOT ${FTYPE}_FILES_RESULT EQUAL "0")
  endforeach(${FTYPE}_FILE)
  message(STATUS "SUCCESS")
endmacro(make_qt_file)

macro(make_rc_file FTYPE QTCOMMAND WORKDIR OLDAPP NEWPREP NEWAPP)
  message(STATUS "generating .${NEWAPP} files ...")
  foreach(${FTYPE}_FILE IN LISTS ${FTYPE}_FILES)
    message(STATUS "executing ${QTCOMMAND} -name ${${FTYPE}_FILE} ${${FTYPE}_FILE}.${OLDAPP} -o ${NEWPREP}${${FTYPE}_FILE}.${NEWAPP}")
    execute_process(COMMAND "${QTCOMMAND}" "-name" "${${FTYPE}_FILE}" "${${FTYPE}_FILE}.${OLDAPP}" "-o" "${NEWPREP}${${FTYPE}_FILE}.${NEWAPP}" WORKING_DIRECTORY "${WORKDIR}" RESULT_VARIABLE ${FTYPE}_FILES_RESULT ERROR_VARIABLE ${FTYPE}_FILES_ERR)
    if(NOT ${FTYPE}_FILES_RESULT EQUAL "0")
      message(FATAL_ERROR "processing of ${${FTYPE}_FILE}.ui failed. ${${FTYPE}_FILES_ERR}")
    endif(NOT ${FTYPE}_FILES_RESULT EQUAL "0")
  endforeach(${FTYPE}_FILE)
  message(STATUS "SUCCESS")
endmacro(make_rc_file)

make_qt_file(UI "${QT_UIC_EXECUTABLE}" "${CMAKE_SOURCE_DIR}" "ui" "ui_" "h")
make_qt_file(MOC "${QT_MOC_EXECUTABLE}" "${CMAKE_SOURCE_DIR}" "h" "moc_" "cpp")
make_rc_file(RC "${QT_RCC_EXECUTABLE}" "${CMAKE_SOURCE_DIR}" "qrc" "qrc_" "cpp")

macro(find_header HDRNAME EXTRAPATH VARNAME)
  set(CMAKE_INCLUDE_PATH "${EXTRAPATH}")
  message(STATUS "Looking for ${HDRNAME} header ...")
  find_path(${VARNAME}_INC "${HDRNAME}")
  if(NOT ${VARNAME}_INC)
    message(FATAL_ERROR "Looking for ${HDRNAME} header - not found!")
  else(NOT ${VARNAME}_INC)
    message(STATUS "Looking for ${HDRNAME} header - found in ${${VARNAME}_INC}")
    include_directories("${${VARNAME}_INC}")
  endif(NOT ${VARNAME}_INC)
endmacro(find_header)

macro(find_lib LIBNAME EXTRAPATH VARNAME)
  set(CMAKE_LIBRARY_PATH "${EXTRAPATH}")
  message(STATUS "Looking for ${LIBNAME} library ...")
  find_library(${VARNAME}_LIB ${LIBNAME})
  if(NOT ${VARNAME}_LIB)
    message(FATAL_ERROR "Looking for ${LIBNAME} library - not found!")
  else(NOT ${VARNAME}_LIB)
    message(STATUS "Looking for ${LIBNAME} library - found ${${VARNAME}_LIB}")
  endif(NOT ${VARNAME}_LIB)
endmacro(find_lib)


find_header("libdjvu/ddjvuapi.h"  "${M_EXTRA_DJVULIBRE_INC}" DJVULIBRE)
find_lib("djvulibre"  "${M_EXTRA_DJVULIBRE_LIB}" DJVULIBRE)
find_header("mysql.h" "${M_EXTRA_MYSQL_INC}" MYSQL)
if(M_MYSQLDLIB_CHECK)
	find_lib("mysqld" "${M_EXTRA_MYSQLD_LIB}" MYSQL)
else(M_MYSQLDLIB_CHECK)
	message(STATUS "Looking for mysqld library ... skipped")
endif(M_MYSQLDLIB_CHECK)
find_header("archive.h" "${M_EXTRA_ARCHIVE_INC}" ARCHIVE)
find_header("archive_entry.h" "${M_EXTRA_ARCHIVE_INC}" ARCHIVE)
find_lib("archive" "${M_EXTRA_ARCHIVE_LIB}" ARCHIVE)
if(M_PDF)
	message(STATUS "Pdf viewer (Poppler library) is turned ON.")
	find_header("poppler/qt4/poppler-qt4.h" "${M_EXTRA_POPPLER_INC}" POPPLER)
	find_lib("poppler-qt4" "${M_EXTRA_POPPLER_QT4_LIB}" POPPLER)
else(M_PDF)
	message(STATUS "Pdf viewer (Poppler library) is turned OFF and WILL NOT be built. Definition NO_POPPLER is set.")
	add_definitions(-DNO_POPPLER)
endif(M_PDF)

add_subdirectory("ibycus")
add_subdirectory("djview410")

find_package(BZip2 "1" REQUIRED)
if(NOT BZIP2_FOUND)
  message(FATAL_ERROR "bzip2 not found")
else(NOT BZIP2_FOUND)
  message(STATUS "bzip2 found - ${BZIP2_INCLUDE_DIR}, ${BZIP2_LIBRARIES}")
  include_directories("${BZIP2_INCLUDE_DIR}")
endif(NOT BZIP2_FOUND)

string(STRIP "${M_MYSQLD_LINKER_FLAGS}" MYSQLD_LINKER_FLAGS)
if(${CMAKE_SYSTEM_NAME} STREQUAL "Linux")
  if("${MYSQLD_LINKER_FLAGS}" STREQUAL "")
    execute_process(COMMAND ${M_MYSQL_CONFIG_COMMAND} "--libmysqld-libs" RESULT_VARIABLE MCMDR OUTPUT_VARIABLE MCMDO ERROR_VARIABLE MCMDE)
    if(MCMDR EQUAL "0")
      set(MYSQLD_LINKER_FLAGS "${MCMDO}")
      message(STATUS "linker flags for mysqld retrieved, " "${M_MYSQL_CONFIG_COMMAND}" " --libmysqld-libs: " "${MCMDO}")
    else(MCMDR EQUAL "0")
      message(WARNING "linker flags for mysqld cannot be retrieved! (" "${M_MYSQL_CONFIG_COMMAND}" " --libmysqld-libs): " "${MCMDO}" " | " "${MCMDE}")
    endif(MCMDR EQUAL "0")
  else("${MYSQLD_LINKER_FLAGS}" STREQUAL "")
    message(STATUS "user defined linker flags for mysqld: ${MYSQLD_LINKER_FLAGS}")
  endif("${MYSQLD_LINKER_FLAGS}" STREQUAL "")

  string(REPLACE " " ";" MYSQLD_LINKER_FLAGS "${MYSQLD_LINKER_FLAGS}")
endif(${CMAKE_SYSTEM_NAME} STREQUAL "Linux")

macro(find_mdir VARNAME DIRNAME MESSAGETXT PATHNAME MESSAGETYPE)
  message(STATUS "${MESSAGETXT}")
  find_path(M_DATA_${VARNAME}_PATH "${DIRNAME}" PATHS "${PATHNAME}"
	     NO_DEFAULT_PATH
             NO_CMAKE_ENVIRONMENT_PATH
             NO_CMAKE_PATH
             NO_SYSTEM_ENVIRONMENT_PATH
             NO_CMAKE_SYSTEM_PATH )
  if(M_DATA_${VARNAME}_PATH)
    message(STATUS "${MESSAGETXT}  - found in ${M_DATA_${VARNAME}_PATH}")
  else(M_DATA_${VARNAME}_PATH)
    message(${MESSAGETYPE} "${MESSAGETXT} - not found")
  endif(M_DATA_${VARNAME}_PATH)
endmacro(find_mdir)

if(M_INSTALL_DATA)
	message(STATUS "Application data check is turned ON.")
	find_mdir(LIB "library" "Looking for Marcion's 'library' directory" "${M_APP_DATA}" WARNING)
	find_mdir(DATA "data" "Looking for Marcion's 'data' directory" "${M_APP_DATA}" FATAL_ERROR)
	find_mdir(MYSQLDAT "data" "Looking for Marcion's 'mysql/data' directory" "${M_APP_DATA}/mysql" FATAL_ERROR)
	find_mdir(MYSQLSHR "share" "Looking for MySql 'share' directory" "${MYSQL_INC}/.." FATAL_ERROR)
else(M_INSTALL_DATA)
	message(STATUS "Application data check is turned OFF.")
endif(M_INSTALL_DATA)

set(CPPFILES cwordtemplate.cpp dialects3.cpp grammar.cpp wordpreview.cpp addword.cpp lsj.cpp librarywidget.cpp ctranslit.cpp cmysql.cpp searchcriteria2.cpp worditem.cpp messages.cpp reorder.cpp tlgselector2.cpp librarysearch.cpp crumwidget.cpp bookreader.cpp djvuwidget.cpp libsearchresult.cpp settings.cpp latcopt.cpp main.cpp booktextbrowser.cpp mimage.cpp mbzip.cpp mainwnd.cpp crumresulttree.cpp textcolorchooser.cpp textbrowserext.cpp aboutdialog.cpp marckeyb.cpp licensedialog.cpp outstr.cpp progressdialog.cpp tbldesigner.cpp htmlindexdialog.cpp htmlreader.cpp graphicsarea.cpp intlintr.cpp translat.cpp copinttr.cpp translitem.cpp exporttr.cpp translbook.cpp treecombobox.cpp bookedit.cpp regexpbuilder.cpp mlibtitle.cpp mexecsql.cpp libsearchbase.cpp libbase.cpp filechooser.cpp mmsgtitle.cpp mdownloadweb.cpp mindexdir2.cpp mlibsearchtitle.cpp msetttitle.cpp mlabel.cpp cmsgbrowser.cpp mbuildconfig.cpp mhistory.cpp meditimgitem.cpp mreorderimageitem.cpp mimagewidget.cpp mnewindexdir.cpp mlibrarybranches.cpp marchiveitem.cpp mchoosecategory.cpp mdroparchive.cpp marchiver.cpp mcreatearchive.cpp msetarchivedata.cpp mfsclip.cpp mlibtreewidget.cpp mdocumentbase.cpp mtcpserver.cpp msessiondialog.cpp mtcplistenwidget.cpp mremaptgz.cpp mcopticnumerals.cpp mcmbboxresult.cpp mprogressicon.cpp mrenamedialog.cpp mcontentbook.cpp mspiniter.cpp msimulitem.cpp mversedbook.cpp marchivewidget.cpp mvbooksbw.cpp mdocheader.cpp mdjvureader2.cpp mimagebookreader.cpp mwindowswidget.cpp mopenbooktitle.cpp msrwidget.cpp mnotepad.cpp msbeditwdg.cpp mfontchooser.cpp mexportarchive.cpp mtipofthewiseman.cpp mnavwnd.cpp mmaps.cpp mhebrdict.cpp moc_latcopt.cpp moc_settings.cpp moc_lsj.cpp moc_wordpreview.cpp moc_addword.cpp moc_searchcriteria2.cpp moc_grammar.cpp moc_crumwidget.cpp moc_dialects3.cpp moc_booktextbrowser.cpp moc_librarywidget.cpp moc_tlgselector2.cpp moc_bookreader.cpp moc_librarysearch.cpp moc_libsearchresult.cpp moc_reorder.cpp moc_messages.cpp moc_mimage.cpp moc_mainwnd.cpp moc_textcolorchooser.cpp moc_textbrowserext.cpp moc_aboutdialog.cpp moc_marckeyb.cpp moc_licensedialog.cpp moc_progressdialog.cpp moc_tbldesigner.cpp moc_htmlindexdialog.cpp moc_htmlreader.cpp moc_intlintr.cpp moc_translat.cpp moc_copinttr.cpp moc_translitem.cpp moc_exporttr.cpp moc_translbook.cpp moc_treecombobox.cpp moc_bookedit.cpp moc_regexpbuilder.cpp moc_mlibtitle.cpp moc_mexecsql.cpp moc_filechooser.cpp moc_mmsgtitle.cpp moc_mdownloadweb.cpp moc_mindexdir2.cpp moc_mlibsearchtitle.cpp moc_msetttitle.cpp moc_cmsgbrowser.cpp moc_mbuildconfig.cpp moc_mhistory.cpp moc_meditimgitem.cpp moc_mreorderimageitem.cpp moc_mimagewidget.cpp moc_mnewindexdir.cpp moc_mlibrarybranches.cpp moc_marchiveitem.cpp moc_mchoosecategory.cpp moc_mdroparchive.cpp moc_marchiver.cpp moc_mcreatearchive.cpp moc_msetarchivedata.cpp moc_mlibtreewidget.cpp moc_mtcpserver.cpp moc_msessiondialog.cpp moc_mtcplistenwidget.cpp moc_mremaptgz.cpp moc_mcopticnumerals.cpp moc_mprogressicon.cpp moc_mrenamedialog.cpp moc_mcontentbook.cpp moc_mspiniter.cpp moc_msimulitem.cpp moc_mversedbook.cpp moc_marchivewidget.cpp moc_mvbooksbw.cpp moc_mdocheader.cpp moc_mdjvureader2.cpp moc_mimagebookreader.cpp moc_mwindowswidget.cpp moc_mopenbooktitle.cpp moc_mnotepad.cpp moc_msbeditwdg.cpp moc_mfontchooser.cpp moc_mexportarchive.cpp moc_mtipofthewiseman.cpp moc_mnavwnd.cpp moc_mmaps.cpp moc_mhebrdict.cpp qrc_resfile.cpp qrc_splash.cpp)
if(M_PDF)
	set(CPPFILES ${CPPFILES} mpdfsbwdg.cpp mpdfreader2.cpp moc_mpdfsbwdg.cpp moc_mpdfreader2.cpp)
endif(M_PDF)

add_executable(marcion ${CPPFILES})

set_target_properties(marcion PROPERTIES INSTALL_RPATH_USE_LINK_PATH TRUE)

target_link_libraries(marcion ibycus djview)
target_link_libraries(marcion "${QT_QTCORE_LIBRARY}" "${QT_QTGUI_LIBRARY}" "${QT_QTXML_LIBRARY}" "${QT_QTNETWORK_LIBRARY}" "${QT_QTWEBKIT_LIBRARY}")

target_link_libraries(marcion "${DJVULIBRE_LIB}" "${ARCHIVE_LIB}")

if(M_MYSQLDLIB_CHECK)
	target_link_libraries(marcion "${MYSQL_LIB}")
else(M_MYSQLDLIB_CHECK)
	message(STATUS "Checking of MySql library is turned OFF.")
endif(M_MYSQLDLIB_CHECK)
if(M_PDF)
	target_link_libraries(marcion "${POPPLER_LIB}")
endif(M_PDF)
target_link_libraries(marcion "${BZIP2_LIBRARIES}")


if(NOT "${MYSQLD_LINKER_FLAGS}" STREQUAL "")
  if(${CMAKE_SYSTEM_NAME} STREQUAL "Linux")
    list(LENGTH MYSQLD_LINKER_FLAGS LL)
    set(LC "0")
    while(${LL} GREATER ${LC})
      list(GET MYSQLD_LINKER_FLAGS ${LC} MYFLAG)
      string(STRIP "${MYFLAG}" MYFLAG)
      string(REGEX MATCH "^${CMAKE_LINK_LIBRARY_FLAG}" MYFLAG_ST "${MYFLAG}")
      if("${MYFLAG_ST}" STREQUAL "${CMAKE_LINK_LIBRARY_FLAG}" AND NOT "${MYFLAG}" STREQUAL "${CMAKE_LINK_LIBRARY_FLAG}mysqld")
	string(REGEX REPLACE "^${CMAKE_LINK_LIBRARY_FLAG}" "" MYFLAG ${MYFLAG})
	target_link_libraries(marcion ${MYFLAG})
	message(STATUS "library added to linker: ${MYFLAG}")
      endif("${MYFLAG_ST}" STREQUAL "${CMAKE_LINK_LIBRARY_FLAG}" AND NOT "${MYFLAG}" STREQUAL "${CMAKE_LINK_LIBRARY_FLAG}mysqld")
    math(EXPR LC "${LC} + 1")
    endwhile(${LL} GREATER ${LC})
  endif(${CMAKE_SYSTEM_NAME} STREQUAL "Linux")
endif(NOT "${MYSQLD_LINKER_FLAGS}" STREQUAL "")

if(M_INSTALL_DATA)
	message(STATUS "Application data install is turned ON.")
	install(DIRECTORY "${M_DATA_DATA_PATH}/data" "${M_DATA_LIB_PATH}/library" "mysql" "doc" "fonts" "icons"  DESTINATION "${CMAKE_INSTALL_PREFIX}" PATTERN ".svn" EXCLUDE)
	install(DIRECTORY "${M_DATA_MYSQLDAT_PATH}/data" "${M_DATA_MYSQLSHR_PATH}/share" DESTINATION "${CMAKE_INSTALL_PREFIX}/mysql" PATTERN ".svn" EXCLUDE)
else(M_INSTALL_DATA)
	message(STATUS "Application data install is turned OFF.")
endif(M_INSTALL_DATA)
install(TARGETS marcion RUNTIME DESTINATION "${CMAKE_INSTALL_PREFIX}")
