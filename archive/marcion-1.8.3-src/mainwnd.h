/*  Marcion
    Copyright (C) 2009-2016 Milan Konvicka

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA. */

#ifndef MAINWND_H
#define MAINWND_H

#include "messages.h"
#include "ctranslit.h"
#include "settings.h"
#include "addword.h"
#include "wordpreview.h"
#include "bookreader.h"
#include "grammar.h"
#include "mdjvureader2.h"
#include "librarywidget.h"
#include "marchivewidget.h"
#include "librarysearch.h"
#include "tlgselector2.h"
#include "mversedbook.h"
#include "lsj.h"
#include "mhebrdict.h"
#include "crumwidget.h"
#include "cmysql.h"
#include "mmaps.h"
#include "mbzip.h"
#include "aboutdialog.h"
#include "progressdialog.h"
#include "translat.h"
#include "copinttr.h"
#include "mdownloadweb.h"
#include "mlibtitle.h"
#include "mmsgtitle.h"
#include "mlibsearchtitle.h"
#include "msetttitle.h"
#include "mopenbooktitle.h"
#include "mexecsql.h"
#include "mindexdir2.h"
#include "mdroparchive.h"
#include "mtcplistenwidget.h"
#include "mcopticnumerals.h"
#include "mprogressicon.h"
#include "mcontentbook.h"
#include "mwindowswidget.h"
#include "msrwidget.h"
#include "mnotepad.h"
#include "mexportarchive.h"
#include "mtipofthewiseman.h"

#include <QMainWindow>
#include <QPixmap>
#include <QFileDialog>
#include <QDate>
#include <QWidgetAction>
#include <QSystemTrayIcon>
#include <QMenu>
#include <QRadioButton>

#include <IbycusAuthTab.h>

//

namespace Ui {
    class MainWnd;
}

class MainWnd : public QMainWindow {
    Q_OBJECT
public:
    MainWnd(MProgressIcon & splash,QWidget *parent = 0);
    ~MainWnd();

private slots:
        void on_actionIndex_directory_triggered();
        void on_dockSearchLibrary_visibilityChanged(bool visible);
        void on_dockLibrary_visibilityChanged(bool visible);
        void on_actionExecute_SQL_triggered();
        void on_actionMaximize_triggered();
        void on_actionMinimize_triggered();
        void on_actionDownload_web_triggered();
        void on_actionLibrary_2_triggered(bool checked);
        void on_actionSettings_2_triggered(bool checked);
        void on_actionMessages_triggered(bool checked);
        void on_actionSearch_triggered(bool checked);
        void on_actionLibrary_triggered(bool checked);
        void on_actionILT_triggered(bool checked);
        void on_actionDictionaries_triggered(bool checked);
        void on_menuView_aboutToShow();
        void on_actionMarcion_on_Facebook_triggered();
        void on_actionCreate_html_data_triggered();
        void on_action_re_create_tables_2_triggered();
        void on_actionRestore_data_triggered();
        void on_actionBackup_data_triggered();
        void on_actionExamine_data_triggered();
        void on_action_re_create_tables_triggered();
        void on_actionNew_triggered();
        void on_actionOpen_triggered();
        void on_actionSession_variables_triggered();
        void on_actionGlobal_variables_triggered();
        void on_actionFullscreen_triggered();
        void on_actionCzech_online_triggered();
        void on_actionEnglish_online_triggered();
        void on_actionMarcion_Project_Page_triggered();
        void on_actionOpen_Discussion_forum_triggered();
        void on_actionDocumentation_online_triggered();
        void on_actionAbout_triggered();
        void on_dwiSettings_visibilityChanged(bool visible);
        void on_actionTabfile_triggered();
        void on_actionCreate_index_of_coptic_tables_triggered();
        void on_actionImport_collection_2_triggered();
        void on_actionMaps_triggered();
        //void on_actionInfo_Local_triggered();
        void on_actionSql_triggered();
        void on_actionCsv_triggered();
        void on_dwiMsg_visibilityChanged(bool visible);
        void on_actionShow_messages_triggered();
        //void on_actionImport_collection_triggered();
        void on_actionCrum_triggered();
        void on_actionTattam_triggered();
        void on_actionQuery_LSJ_triggered();
        void on_actionSearch_library_triggered();
        void on_actionOpen_TLG_PHI_triggered();
        void on_actionView_library_triggered();
        void on_actionClear_messages_triggered();
        void on_actionPlumley_triggered();
        void on_actionOpen_book_triggered();
        void on_actionQuit_triggered();
        void on_actionQuery_triggered();
        void on_actionNew_word_triggered();
        void on_actionSettings_triggered();

        void settings_scan_toggled(bool);
        void settings_scan_lang_toggled(bool);
        void settings_tray_toggled(bool);
        void app_clipboard_textChanged();
        void slot_trayIconActivated(QSystemTrayIcon::ActivationReason);
        void slot_trayMenuTriggered(QAction * action);
        void slot_trayMenuLangTriggered(QAction * action);
        void slot_bookMenuTriggered(QAction * action);

        void copticEditMode(bool);
        void slot_settingsChanged(int);
        void slot_resizeIcons(bool);
        void slot_msgTitleRequest(int);
        void slot_libSTitle_hide();
        void slot_recFilesMenu_aboutToShow();
        void slot_mnuBooks_aboutToShow();
        void slot_mnuViewBooks_aboutToShow();
        void slot_recFileItemToggled();
        void slot_recFileItemClear();
        void slot_fileOpenRequest(QString filename);
        void slot_tcpServerStopped();
        void on_action_re_create_index_of_TLG_PHI_triggered();
        void on_actionSupported_image_formats_triggered();
        void on_actionDrop_entire_archive_triggered();
        void on_actionManage_archive_triggered();
        void on_actionDrop_mysql_library_triggered();
        void on_actionCoptic_numerals_triggered();
        void on_actionImport_coptic_dictionary_triggered();
        void on_actionBennett_Latin_grammar_triggered();
        void on_tabSearchResults_tabCloseRequested(int index);
        void on_actionOpened_books_2_triggered(bool checked);
        void on_dwiBooks_visibilityChanged(bool visible);
        void on_actionEdit_text_file_triggered();
        void on_actionOpened_books_triggered(bool checked);
        void on_actionExport_archive_triggered();
        void on_actionImport_data_triggered();
        void on_actionShow_tip_triggered();
        void on_action_re_create_index_of_Gk_Lat_dictionary_triggered();
        void on_action_Hebrew_triggered();

protected:
        void closeEvent(QCloseEvent * event);
        void keyPressEvent(QKeyEvent * event);
private:
        Ui::MainWnd *ui;

        QSystemTrayIcon tri;
        QLabel sbLabel,sbILabel;

        CMessages messages;
        CSettings settings;

        QString nam_ver;

        MLibTitle libTitle;
        MMsgTitle msgTitle;
        MLibSearchTitle libSTitle;
        MSettTitle settTitle;
        MOpenBookTitle openBookTitle;

        MWindowsWidget opened_books;

        CLibraryWidget library;
        CLibrarySearch library_search;

        MArchiveWidget _archW;

        QLineEdit txtLike;
        MTcpListenWidget wdgTcp;

        CCopIntTr * idb;

        QMenu tri_menu,tri_lang_menu,tri_wnds_menu,wnds_menu;

        CWordPreview * wpr;
        CLSJ * wlsj;

        QToolBar * tbrDict,*tbrLib;
        QAction * ta_lib,*ta_libsrch;

        QAction *a_activate, *a_tri_home,*a_tri_fb,*a_tri_max,*a_tri_min,*a_tri_norm,*a_tri_full,*a_tri_clip,*a_tri_about,*a_tri_sett,*a_tri_quit,*a_tri_hide;
        QAction *a_latin,*a_greek,*a_coptic;

        QToolButton esett,emsg;
        MProgressIcon & _splash;

        //bool check_updates(bool closeConn=true);
        //void update(CMySql::Dbase from,
        //            CMySql::Dbase to);
        void backupCrum();
        //void backupCrumUtf8();
        //void DBInfo(CMySql::Dbase db);

        int import(QString const & dir);
        QStringList formatWForTabfile(QString const & str) const;
        QString formatMForTabfile(QString const & str) const;
        //QString version() const;
        void setMainWTitle();
        void showVariables(QString const &);
        void initTrayMenu();
        void initToolBar();
        void saveWState();
        void restoreWState();
        void storeRecentFiles() const;
        void loadRecentFiles();
};

#endif // MAINWND_H
