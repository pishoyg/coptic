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

#include <stdio.h>

#include "messages.h"
#include "ui_messages.h"

//

CMessages * _m_msg(0);
void set_m_msg(CMessages * m){_m_msg=m;}
CMessages * m_msg(){return _m_msg;}

//
CMessages::CMessages( QLabel *const label,
        //QLabel *const libLabel,
        QLabel *const iLabel,
        QMainWindow * const mainw,
	CSettings const * const settings,
        /*QComboBox ** const crumpg,*/
        QSystemTrayIcon * const tri,
        CLibSearchBase & libsearch,
        CLibBase & libwdg,
        QWidget * parent)
    : QWidget(parent),
      ui(new Ui::frmMessages),
        label(label),/*libLabel(libLabel),*/iLabel(iLabel),
        mainw(mainw),
        _settings(settings),
        /*_crumpg(crumpg),*/
        tri(tri),
        libsearch(libsearch),
        libwdg(libwdg),
        msg_disabled(false),
        last_error()
{
    ui->setupUi(this);
    clear();
}

CMessages::~CMessages()
{
    delete ui;
}

//

void CMessages::MsgOk()
{
        OSTREAM << "OK.\n";
        OSTREAM.flush();

        ui->txtErrs->appendPlain("OK.");
        label->setText(tr("status: OK"));

        QApplication::processEvents();
}

void CMessages::MsgErr(QString const & Msg)
{
        OSTREAM << Msg << "\n";
        OSTREAM.flush();


        ui->txtErrs->appendPlain(Msg+"\nERROR.");

        label->setText(tr("status: Error"));
        label->setToolTip(tr("last error: ")+Msg);
        last_error=Msg;

        QMessageBox(QMessageBox::Critical,"Error",Msg,QMessageBox::Close,0).exec();
        QApplication::processEvents();
}

void CMessages::MsgMsg(QString const & Msg, bool sbar)
{
    if(!msg_disabled)
    {
        OSTREAM << Msg << "\n";
        OSTREAM.flush();

        ui->txtErrs->appendPlain(Msg);

        if(sbar)
            mainw->statusBar()->showMessage(Msg,20000);

        QApplication::processEvents();
    }
}
void CMessages::MsgWarn(QString const & Msg) const
{
    OSTREAM << Msg << "\n";
    OSTREAM.flush();

    ui->txtErrs->appendPlain(Msg);

    label->setText(tr("Warning."));

    QMessageBox(QMessageBox::Warning,tr("Warning"),Msg,QMessageBox::Ok,0).exec();
    QApplication::processEvents();
}

void CMessages::MsgInf(QString const & Msg,QWidget * parent) const
{
    OSTREAM << Msg << "\n";
    OSTREAM.flush();

    ui->txtErrs->appendPlain(Msg);

    QMessageBox(QMessageBox::Information,tr("Information"),Msg,QMessageBox::Ok,parent).exec();
    mainw->statusBar()->showMessage(Msg,20000);
    QApplication::processEvents();
}

CSettings const & CMessages::settings() const
{
	return *_settings;
}

/*void CMessages::repaintMainW()
{
    if(!mainw->isMinimized())
        mainw->update();
}*/

QString CMessages::version() const
{
    return QString(QCoreApplication::applicationName()+" "+QCoreApplication::applicationVersion());
}

CLibSearchBase & CMessages::libSearchWidget() const
{
    return libsearch;
}

CLibBase & CMessages::libWidget() const
{
    return libwdg;
}

void CMessages::clear() const
{
    ui->txtErrs->clear();

    OSTREAM << QString(version()+tr("\nCopyright (c) 2009-2016 Milan Konvicka. All rights reserved.\nThis software comes with ABSOLUTELY NO WARRANTY. This is free software, and you are welcome to modify and redistribute it under the GPL v2 license.\n\n"));
    OSTREAM.flush();
    ui->txtErrs->insertHtml(QString("<b><big>"+version()+tr("</big></b><br>Copyright &copy; 2009-2016 Milan Konvicka. All rights reserved.<br>This software comes with ABSOLUTELY NO WARRANTY. This is free software, and you are welcome to modify and redistribute it under the GPL v2 license.<br><br>")));
}

void CMessages::printHelp() const
{
    QString h;
    /*h.append(QObject::tr("<br>Copyright (c) 2009-2016 Milan Konvicka. All rights reserved.<br>This software comes with ABSOLUTELY NO WARRANTY. This is free software, and you are welcome to modify and redistribute it under the GPL v2 license.<br><br>"));*/

    h.append(QObject::tr("<p>usage: marcion [FILE]... [OPTION]...<br>Execute Marcion with OPTION(s) and open FILE(s)</p>"));
    h.append(QObject::tr("<dl><lh>options:</lh>"));
    h.append("<dt>--standalone-server, -s");
    h.append(QObject::tr("<dd>connected is standalone mysql server (local or remote) instead embedded"));
    h.append("<dt>--mysql-server-opts, -e");
    h.append(QObject::tr("<dd>following arguments [arg1] [arg2] [arg3] ... [argN] are passed into embedded mysql server. using of it clears all internal options of server. (this argument should be used as last of all others arguments)"));
    h.append(QObject::tr("<dt>--connect=comma separated list of values"));
    h.append(QObject::tr("<dd>comma separated list of values used for connection to server. (order: host,user,password,database,port)"));
    h.append("<dt>--test, -t");
    h.append(QObject::tr("<dd>test of server and connection"));
    h.append("<dt>--show-global-vars, -g");
    h.append(QObject::tr("<dd>shows global variables obtained from running MySql server"));
    h.append("<dt>--show-session-vars, -i");
    h.append(QObject::tr("<dd>shows session variables obtained from running MySql server"));
    h.append("<dt>--like=string");
    h.append(QObject::tr("<dd>sets filter for list of global and/or session variables invoked by -g and/or -i"));
    h.append("<dt>--rm-config, -r");
    h.append(QObject::tr("<dd>removes configuration files 'config.txt' and 'config-defaults.txt' (if exists) before start"));
    h.append("<dt>--from-ro-media, -m");
    h.append(QObject::tr("<dd>no data will be automatically written into files and mysql tables (this is useful when application is running from readonly media)"));
    h.append("<dt>--version, -V");
    h.append(QObject::tr("<dd>version"));
    h.append("<dt>--help, -h");
    h.append(QObject::tr("<dd>this help</dl>"));
    h.append(QObject::tr("<br><ul><lh>Notes:</lh><li>options -s and -e cannot be used together<li>if you are using -e, then use it as last parameter. all parameters following -e are passed to mysql server<li>-t can be used together with -s, -e, --connect</ul>"));
    h.append(QObject::tr("for more informations look at http://marcion.sourceforge.net/docs/<br><br>"));

    ui->txtErrs->insertHtml(h);
    ui->txtErrs->goToBottom();
}

void CMessages::goToTop()
{
    ui->txtErrs->goToTop();
}

void CMessages::goToBottom()
{
    ui->txtErrs->goToBottom();
}

void CMessages::appendHtml(QString const & html)
{
    ui->txtErrs->appendHtml(html);
}

void CMessages::printVersion() const
{
    ui->txtErrs->insertHtml("<br>"+QCoreApplication::applicationName()+" "+QCoreApplication::applicationVersion()+"<br>");
    ui->txtErrs->insertHtml(tr("Qt version: ")+QString(QT_VERSION_STR)+"<br>");
    ui->txtErrs->insertHtml(tr("MySql client: ")+QString(mysql_get_client_info())+"<br>");
    ui->txtErrs->insertHtml(tr("MySql server: ")+QString(mysql_get_server_info(CMySql::m_init))+"<br>");

    ui->txtErrs->goToBottom();
}

void CMessages::activateMessages()
{
    parentWidget()->show();
    ui->txtErrs->goToBottom();
    mainw->activateWindow();
}
