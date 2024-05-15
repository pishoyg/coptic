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

#include <QtGui/QApplication>
#include <QObject>
//#include <QSplashScreen>
#include <QBitmap>
#include <QtGlobal>
#include <QTextStream>
#include <QTranslator>
#include <QTime>

#include "mainwnd.h"
#include "outstr.h"
#include "settings.h"
#include <mysql.h>
#include "cmysql.h"
#include "mtcpserver.h"
#include "msessiondialog.h"
#include "mprogressicon.h"

QString host("127.0.0.0");
QString user("marcion");
QString pwd("marcion");
QString db("marcion");

unsigned int port(0);

bool tests=false;
bool globvar=false,sessvar=false;
QString like_v("%");
bool extra_server_options=false;
int extra_sopts_count=0;
char ** extra_sopts=0;

int const num_elements = 4;
char * server_options[num_elements]=
{
    (char*)"--defaults-file=./mysql/my.cnf",
    (char*)"--basedir=./mysql",
    (char*)"--default-storage-engine=MyIsam",
    (char*)"--skip-innodb"
};

char * server_groups[] = { (char*)"embedded", 0 };

int getMainArgs(int argc, char *argv[]);
void showGlobVars(),showSessVars();
void printVersion(),printHelp();
void finishMysql(bool);
void removeConfigFile();

bool standalone=false;

int main(int argc, char *argv[])
{
    CSettings::app_start_time=QDateTime::currentDateTime();

    QApplication a(argc, argv);
    a.setApplicationName("Marcion");
    a.setApplicationVersion("1.8.3");
    a.setOrganizationName("Vagrant");
    a.setOrganizationDomain("Vagrant");
    a.setWindowIcon(QIcon(":/new/icons/icons/main.png"));

    int err=getMainArgs(argc,argv);
    OSTREAM.flush();
    switch(err)
    {
    case 2 :
        return 0;
    case 0 :
        break;
    default:
        return err;
        break;
    }

    CSettings::marcDir=QDir::toNativeSeparators(QCoreApplication::applicationDirPath());

    if(!QDir::setCurrent(CSettings::marcDir))
    {
        OSTREAM << "cannot change current directory to " << CSettings::marcDir << "\n";
        OSTREAM.flush();
        return 13;
    }
    else
    {
        OSTREAM << "current directory changed to " << CSettings::marcDir << "\n";
        OSTREAM.flush();
    }

    QTranslator qtTranslator;
    MProgressIcon splash;
    splash.setWindowFlags(Qt::SplashScreen/*|Qt::WindowStaysOnTopHint*/);
    if(!tests)
    {
        SET_BUSY_CURSOR

        QTime t;
        splash.setSilent(true);
        splash.setPixmap(QPixmap(":/splash/icons/splash/img2.png"),MProgressIcon::Picture,-1);
        splash.setPixmap(QPixmap(":/splash/icons/splash/img3.png"),MProgressIcon::Main,-1);
        splash.setPixmap(QPixmap(":/splash/icons/splash/img1.png"),MProgressIcon::Part,-1);
        splash.applyMask();
        splash.setBorderColor(Qt::black);
        splash.setBorderColorPart(Qt::black);
        splash.processEvents(true);
        splash.alwaysRepaintMain(true);
        QRect const sg= QApplication::desktop()->screenGeometry();
        if(sg.isValid()&&!sg.isNull()&&!sg.isEmpty())
        {
            QPoint pt(sg.center());
            pt.setX(pt.x()-splash.width()/2);
            pt.setY(pt.y()-splash.height()/2);
            if(pt.x()<20)
                pt.setX(20);
            if(pt.y()<20)
                pt.setY(20);
            splash.move(pt);
        }
        else
            splash.move(QPoint(20,20));
        splash.show();

        t.start();
        while(t.elapsed()<=1000)
            QApplication::processEvents();

        splash.setMaximum(7);
    }

    if(!tests)
    {
        a.setQuitOnLastWindowClosed(true);
        QFont appf;
        int lang;
        bool interrupted(false),simple_splash(false);
        bool raf(CSettings::readAppFont(&qtTranslator,lang,appf,simple_splash,interrupted));
        if(interrupted)
        {
            OSTREAM << "interrupted by user during basic configuration\n";
            OSTREAM.flush();
            return 0;
        }

        splash.setSilent(simple_splash);
        splash.useTimer(10);

        if(raf)
        {
            a.setFont(appf);
            OSTREAM << "application font " << appf.family() << " size " << appf.pointSize() << " used\n";
            OSTREAM.flush();
        }
        else
        {
            OSTREAM << "extra application font is turned off\n";
            OSTREAM.flush();
        }

        if(!CSettings::wiz)
        {
            if(lang!=0)
            {
                QString trname(CSettings::marcDir+QDir::separator()+"data"+QDir::separator()+"lang"+QDir::separator()+"marcion_"),lapp;
                switch(lang)
                {
                case CSettings::Czech :
                    lapp="cs";
                    break;
                /*case CSettings::Greek :
                    lapp="el";
                    break;
                case CSettings::German :
                    lapp="de";
                    break;*/
                }
                trname.append(lapp+".qm");

                if(!qtTranslator.load(trname))
                {
                    OSTREAM << "Warning: cannot initialize "+lapp+" language (file '"+trname+"')\n";
                    OSTREAM.flush();
                    //return 14;
                }
                else
                {
                    OSTREAM << lapp+QObject::tr(" language initialized (file '")+trname+"')\n";
                    OSTREAM.flush();
                    a.installTranslator(&qtTranslator);
                }
            }
            else
            {
                OSTREAM << "native language used (english)\n";
                OSTREAM.flush();
            }
        }
    }

    OSTREAM << QObject::tr("Marcion starts at ") <<
               CSettings::app_start_time.toString(Qt::TextDate) << "\n";
    OSTREAM.flush();

    if(!tests&&CSettings::tcpServer->server())
    {
        OSTREAM << QObject::tr("TCP server: listening on 127.0.0.1:12873 ... ");
        OSTREAM.flush();

        if(!CSettings::tcpServer->server()->listen(QHostAddress("127.0.0.1"),12873))
        {
            CSettings::tcpServer->setHasError(true);
            CSettings::tcpServer->setLastErrorStr(CSettings::tcpServer->server()->errorString());
            CSettings::tcpServer->setLastError(CSettings::tcpServer->server()->serverError());

            OSTREAM << QObject::tr("Failed!\n");
            OSTREAM << QObject::tr("TCP server error: ") << CSettings::tcpServer->lastErrorStr() << "\n";
            OSTREAM.flush();
        }
        else
        {
            OSTREAM << "OK\n";
            OSTREAM.flush();
        }
    }

    if(!tests&&CSettings::tcpServer->hasError()&&CSettings::tcpServer->lastError()==QAbstractSocket::AddressInUseError)
    {
        if(CSettings::openFiles.count()>0)
        {
            MSessionDialog sd(CSettings::openFiles.join(QString("\n")));
            if(sd.exec()==QDialog::Accepted)
            {
                switch(sd.action())
                {
                case MSessionDialog::DefautSession :
                {
                    QApplication::setOverrideCursor(Qt::WaitCursor);
                    OSTREAM << QString::number(CSettings::openFiles.count()) << QObject::tr(" files to open, connecting 127.0.0.1:12873 ... ");
                    OSTREAM.flush();

                    QHostAddress h_addr_x("127.0.0.1");
                    QTcpSocket tcp_sock;
                    tcp_sock.connectToHost(h_addr_x,12873,QIODevice::ReadWrite);
                    tcp_sock.waitForConnected(5000);
                    if(!tcp_sock.isOpen())
                    {
                        OSTREAM << QObject::tr("Failed!\n");
                        OSTREAM << QObject::tr("error message: ") << tcp_sock.errorString() << "\n";
                        OSTREAM.flush();
                    }
                    else
                    {
                        OSTREAM << QObject::tr("OK\nsending file names to open (host: 127.0.0.1:12873) ... ");
                        OSTREAM.flush();

                        QByteArray fnames(CSettings::openFiles.join(QString("<*file*separator*>")).toUtf8());
                        MTcpServer::DataType dt(MTcpServer::OpenFile);
                        qint64 w=tcp_sock.write((char*)&dt,sizeof(dt));
                        w+=tcp_sock.write(fnames);
                        tcp_sock.waitForBytesWritten(5000);
                        if(w<0)
                        {
                            OSTREAM << QObject::tr("Failed!\n");
                            OSTREAM << QObject::tr("cannot write data into stream!\n");
                            OSTREAM.flush();
                        }
                        else
                        {
                            OSTREAM << QObject::tr("OK (bytes written: ")+QString::number(w)+QObject::tr(" from ")+QString::number(fnames.count()+sizeof(MTcpServer::DataType))+")\n";
                            OSTREAM << QObject::tr("waiting for TCP server response ... ");
                            OSTREAM.flush();

                            if(tcp_sock.waitForReadyRead(5000))
                            {
                                if(tcp_sock.bytesAvailable()==sizeof(qint64))
                                {
                                    qint64 bs(0);
                                    if(tcp_sock.read((char*)&bs,sizeof(qint64))==sizeof(qint64))
                                    {
                                        OSTREAM << QObject::tr("OK (bytes received: ") << QString::number(bs) << ")\n";
                                        OSTREAM.flush();
                                    }
                                    else
                                    {
                                        OSTREAM << QObject::tr("OK (bytes received: unknown)\n");
                                        OSTREAM.flush();
                                    }
                                }
                                else
                                {
                                    OSTREAM << QObject::tr("OK (bytes received: unknown)\n");
                                    OSTREAM.flush();
                                }
                            }
                            else
                            {
                                OSTREAM << QObject::tr("Failed! (connection timeout)\n");
                                OSTREAM.flush();
                            }
                        }
                        tcp_sock.disconnectFromHost();
                    }
                    OSTREAM << QObject::tr("interrupted by user\n");
                    OSTREAM.flush();
                    QApplication::restoreOverrideCursor();
                    return 0;
                    break;
                }
                case MSessionDialog::NewSession :
                    break;
                case MSessionDialog::Quit :
                    {
                        OSTREAM << QObject::tr("interrupted by user\n");
                        OSTREAM.flush();
                        return 0;
                        break;
                    }
                }
            }
            else
            {
                OSTREAM << QObject::tr("interrupted by user\n");
                OSTREAM.flush();
                return 0;
            }
        }
        else
        {
            QMessageBox mb(QMessageBox::Warning,QObject::tr("Marcion | TCP server"),QObject::tr("Another instance of Marcion seems be active already. IGNORE this message and continue anyway or ABORT this session?"),QMessageBox::Ignore|QMessageBox::Abort);
            if(mb.exec()==QMessageBox::Abort)
            {
                OSTREAM << QObject::tr("interrupted by user\n");
                OSTREAM.flush();
                return 0;
            }
        }
    }

    //QSplashScreen splash;

    OSTREAM << "mysql_library_init() ... ";
    OSTREAM.flush();
    int mlir;
    if(!standalone)
    {
        if(!extra_server_options)
            mlir=mysql_library_init(num_elements, server_options, server_groups);
        else
            mlir=mysql_library_init(extra_sopts_count, extra_sopts, 0);
    }
    else
        mlir=mysql_library_init(-1, 0, 0);

    if(mlir!=0)
    {
        OSTREAM << QObject::tr("Failed! (errorcode: ") << QString::number(mlir) << ")\n";
        OSTREAM.flush();
        return 10;
    }
    else
        OSTREAM << "OK\n";

    OSTREAM.flush();

    OSTREAM << "MySql client: " << QString(mysql_get_client_info()) << "\n";
    OSTREAM.flush();

    OSTREAM << "mysql_init() ... ";
    CMySql::m_init = mysql_init(0);
    if(!CMySql::m_init)
    {
        OSTREAM << QObject::tr("Failed! (out of memory)\n");
        OSTREAM.flush();
        finishMysql(false);
        return 12;
    }
    else
        OSTREAM << "OK\n";

    OSTREAM.flush();

    if(!standalone)
    {
        mysql_options(CMySql::m_init, MYSQL_SET_CHARSET_NAME, "utf8");
        mysql_options(CMySql::m_init, MYSQL_OPT_USE_EMBEDDED_CONNECTION, 0);
    }
    else
        mysql_options(CMySql::m_init, MYSQL_OPT_USE_REMOTE_CONNECTION, 0);

    if(!CMySql::connect_local(host,user,pwd,db,port))
    {
        OSTREAM << CMySql::last_Error();
        OSTREAM.flush();
        finishMysql(true);
        return 11;
    }
    else
    {
        if(globvar)
            showGlobVars();
        if(sessvar)
            showSessVars();
    }

    int r=0;
    if(!tests)
    {
#ifndef Q_WS_WIN
        Q_INIT_RESOURCE(qdjview);
        Q_INIT_RESOURCE(qdjvuwidget);
#endif

        MainWnd w(splash);
        w.show();
        //splash.finish(&w);

        r=a.exec();
    }

    finishMysql(true);

    if(!tests&&CSettings::tcpServer)
    {
        OSTREAM << QObject::tr("closing TCP server ... ");
        CSettings::tcpServer->server()->close();
        OSTREAM << "OK\n";
    }

    if(r==0)
        OSTREAM << QObject::tr("Success!\n");

    OSTREAM.flush();
    QDateTime dt=QDateTime::currentDateTime();
    double s=(double)CSettings::app_start_time.secsTo(dt)/(60*60);
    OSTREAM << QObject::tr("Finished at ") <<
               dt.toString(Qt::TextDate) << QObject::tr(", after ") << QString::number(s,'f',2) << QObject::tr(" hours of progress, started from ") << CSettings::app_start_time.toString(Qt::TextDate) << "\n";
    OSTREAM.flush();
    return r;
}

int getMainArgs(int argc, char *argv[])
{
    for(int x=1;x<argc;x++)
    {
        QString arg(argv[x]);
        if(arg=="--rm-config"||arg=="-r")
        {
            removeConfigFile();
        }
        else if(arg=="--standalone-server"||arg=="-s")
        {
            OSTREAM << QObject::tr("standalone server requested\n");
            standalone=true;
            extra_server_options=false;
            //return 0;
        }
        else if(arg=="--mysql-server-opts"||arg=="-e")
        {
            OSTREAM << QObject::tr("extra server options received\n");
            extra_server_options=true;
            standalone=false;
            extra_sopts_count=argc-x-1;
            extra_sopts=&argv[x+1];

            for(int y=0;y<extra_sopts_count;y++)
                OSTREAM << QObject::tr("option ") << y+1 << QString(extra_sopts[y]) << "\n";
            return 0;
        }
        else if(arg=="--version"||arg=="-V")
        {
            printVersion();
            return 2;
        }
        else if(arg=="--help"||arg=="-h")
        {
            printHelp();
            return 2;
        }
        else if(arg=="--test"||arg=="-t")
        {
            OSTREAM << "test:\n";
            OSTREAM.flush();
            tests=true;
        }
        else if(arg.startsWith("--connect"))
        {
            QString a(arg);
            a.remove("--connect=");
            QStringList al(a.split(","));
            if(al.count()!=5)
            {
                OSTREAM << QObject::tr("incorrect use of --connect\n");
                return 3;
            }
            host=al[0];
            user=al[1];
            pwd=al[2];
            db=al[3];
            port=al[4].toUInt();
        }
        else if(arg=="--show-global-vars"||arg=="-g")
        {
            tests=globvar=true;
        }
        else if(arg=="--show-session-vars"||arg=="-i")
        {
            tests=sessvar=true;
        }
        else if(arg.startsWith("--like"))
        {
            QString a(arg);
            like_v=a.remove("--like=");
        }
        else if(arg=="--from-ro-media"||arg=="-m")
        {
            CSettings::_ro_mode=true;
        }
        else
        {
            CSettings::openFiles.append(QString::fromUtf8(argv[x]));
            OSTREAM << QObject::tr("file to open: '") << CSettings::openFiles.last() << "'\n";
            //return 1;
        }
    }
    return 0;
}

void finishMysql(bool close)
{
    if(close)
    {
        mysql_close(CMySql::m_init);
        OSTREAM << "mysql_close()\n";
    }

    mysql_library_end();
    OSTREAM << "mysql_library_end()\n";
    OSTREAM.flush();
}

void showGlobVars()
{
    OSTREAM << QObject::tr("global variables: filter: ") << like_v << "\n";
    CMySql q(QString("show global variables like \""+like_v+"\""));
    if(q.exec())
    {
        while(q.next())
        {
            QString v1(q.value(0));
            QString v2(q.value(1));
            OSTREAM << QObject::tr("name: ") << v1 << QObject::tr("\nvalue: ") << v2 << "\n";
        }
        OSTREAM << QObject::tr("global variables: end\n");

    }
    else
    {
        OSTREAM << QObject::tr("cannot obtain informations about variables\n");
        OSTREAM << q.lastError() << "\n";
    }
    OSTREAM.flush();
}

void showSessVars()
{
    OSTREAM << QObject::tr("session variables: filter: ") << like_v << "\n";
    CMySql q(QString(QObject::tr("show session variables like \"")+like_v+"\""));
    if(q.exec())
    {
        while(q.next())
        {
            QString v1(q.value(0));
            QString v2(q.value(1));
            OSTREAM << QObject::tr("name: ") << v1 << QObject::tr("\nvalue: ") << v2 << "\n";
        }
        OSTREAM << QObject::tr("session variables: end\n");

    }
    else
    {
        OSTREAM << QObject::tr("cannot obtain informations about variables\n");
        OSTREAM << q.lastError() << "\n";
    }
    OSTREAM.flush();
}

void removeConfigFile()
{
    OSTREAM << QObject::tr("removing file 'config.txt' ... ");
    OSTREAM.flush();

    if(QFile::exists("config.txt"))
    {
        if(QFile::remove("config.txt"))
            OSTREAM << QObject::tr("Ok.\n");
        else
            OSTREAM << QObject::tr("Failed.\n");
    }
    else
        OSTREAM << QObject::tr("cannot remove 'config.txt', file don't exist\n");
    OSTREAM.flush();

    OSTREAM << QObject::tr("removing file 'config-defaults.txt' ... ");
    OSTREAM.flush();

    if(QFile::exists("config-defaults.txt"))
    {
        if(QFile::remove("config-defaults.txt"))
            OSTREAM << QObject::tr("Ok.\n");
        else
            OSTREAM << QObject::tr("Failed.\n");
    }
    else
        OSTREAM << QObject::tr("cannot remove 'config-defaults.txt', file don't exist\n");
    OSTREAM.flush();
}

void printVersion()
{
    OSTREAM << QCoreApplication::applicationName() << " " << QCoreApplication::applicationVersion() << "\n\n";
    OSTREAM << "Qt version: " << QString(QT_VERSION_STR);
    OSTREAM << "\nMySql client: " << QString(mysql_get_client_info()) << "\n\n";
    OSTREAM.flush();
}

void printHelp()
{
    //printVersion();

    OSTREAM << QObject::tr("Copyright (c) 2009-2016 Milan Konvicka. All rights reserved.\n") << QObject::tr("This software comes with ABSOLUTELY NO WARRANTY. This is free software, and you are welcome to modify and redistribute it under the GPL v2 license.\n\n");

    OSTREAM << QObject::tr("usage: marcion [FILE]... [OPTION]...\n");
    OSTREAM << QObject::tr("Execute Marcion with OPTION(s) and open FILE(s)\n\n");
    OSTREAM << QObject::tr("options:\n\n");
    OSTREAM << "--standalone-server, -s\n";
    OSTREAM << QObject::tr("        connected is standalone mysql server (local or remote) instead embedded\n\n");
    OSTREAM << "--mysql-server-opts, -e\n";
    OSTREAM << QObject::tr("        following arguments [arg1] [arg2] [arg3] ... [argN] are passed into embedded mysql server. using of it clears all internal options of server. (this argument should be used as last of all others arguments)\n\n");
    OSTREAM << QObject::tr("--connect=comma separated list of values\n");
    OSTREAM << QObject::tr("        comma separated list of values used for connection to server. (order: host,user,password,database,port)\n\n");
    OSTREAM << "--test, -t\n";
    OSTREAM << QObject::tr("        test of server and connection\n\n");
    OSTREAM << "--show-global-vars, -g\n";
    OSTREAM << QObject::tr("        shows global variables obtained from running MySql server\n\n");
    OSTREAM << "--show-session-vars, -i\n";
    OSTREAM << QObject::tr("        shows session variables obtained from running MySql server\n\n");
    OSTREAM << "--like=string\n";
    OSTREAM << QObject::tr("        sets filter for list of global and/or session variables invoked by -g and/or -i\n\n");
    OSTREAM << "--rm-config, -r\n";
    OSTREAM << QObject::tr("        removes configuration files 'config.txt' and 'config-defaults.txt' (if exists) before start\n\n");
    OSTREAM << "--from-ro-media, -m\n";
    OSTREAM << QObject::tr("        no data will be automatically written into files and mysql tables (this is useful when application is running from readonly media)\n\n");
    OSTREAM << "--version, -V\n";
    OSTREAM << QObject::tr("        version\n\n");
    OSTREAM << "--help, -h\n";
    OSTREAM << QObject::tr("        this help\n\n");
    OSTREAM << QObject::tr("Notes:\n    -> options -s and -e cannot be used together <-\n    -> if you are using -e, then use it as last parameter. all parameters following -e are passed to mysql server <-\n    -> -t can be used together with -s, -e, --connect <-\n\n");
    OSTREAM << QObject::tr("for more informations look at <http://marcion.sourceforge.net/docs/>\n\n");

    OSTREAM.flush();
}
