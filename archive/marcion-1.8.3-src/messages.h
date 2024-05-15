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

#ifndef MESSAGES_H
#define MESSAGES_H
//
#include <QMainWindow>
#include <QStatusBar>
#include <QLabel>
#include <QTabWidget>
#include <QDockWidget>
#include <QMessageBox>
#include <QComboBox>
#include <QTextStream>
#include <QSystemTrayIcon>

#include <mysql.h>
#include "outstr.h"
#include "cmysql.h"

class CSettings;
class CLibBase;
class CLibSearchBase;

namespace Ui {
    class frmMessages;
}
//
class CMessages : public QWidget
{
Q_OBJECT
public:
        CMessages( QLabel *const label,
        //QLabel *const libLabel,
        QLabel *const iLabel,
        QMainWindow * const mainw,
	CSettings const * const settings,
        /*QComboBox ** const crumpg,*/
        QSystemTrayIcon * const tri,
        CLibSearchBase & libsearch,
        CLibBase & libwdg,
    QWidget * parent = 0);
        ~CMessages();

        void goToTop(),goToBottom(),appendHtml(QString const & html);

        void MsgOk(), MsgErr(QString const & Msg), MsgMsg(QString const & Msg, bool sbar=false);
	void MsgWarn(QString const & Msg) const;
        void MsgInf(QString const & Msg,QWidget * parent=0) const;

        void setMsgDisabled(bool disabled){msg_disabled=disabled;}

	CSettings const &  settings() const;
        QSystemTrayIcon * trayIcon()
        {return tri;}
        //void setLibraryInfo(QString const & text)
        //{libLabel->setText(text);}

        //void repaintMainW();

        /*QComboBox * const* crumPg()
        {return _crumpg;}*/
        QMainWindow * mainwindow() const {return mainw;}
        QString lastError() const
        {return last_error;}

        QString version() const;
        CLibSearchBase & libSearchWidget() const;
        CLibBase & libWidget() const;

        void clear() const;
        void printHelp() const,printVersion() const;
        void activateMessages();
private slots:

private:
        Ui::frmMessages *ui;
        QLabel *const label/*,* const libLabel*/,* const iLabel;
        QMainWindow * const mainw;
	CSettings const * const _settings;

        //QComboBox ** const _crumpg;
        QSystemTrayIcon * const tri;
        CLibSearchBase & libsearch;
        CLibBase & libwdg;
        bool msg_disabled;
        QString last_error;
};

void set_m_msg(CMessages *);
CMessages * m_msg();

#endif
