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

#include "mindexdir2.h"
#include "ui_mindexdir2.h"

MIndexDir2::MIndexDir2(CMessages * const messages,
                       QDir const & dir,
                       CLibBase & lib,
                       QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MIndexDir2),
    messages(messages),
    _p(),
    lib(lib)
{
    ui->setupUi(this);

    ui->wdgDir->init(messages,tr("directory"),dir);

    connect(&_p,SIGNAL(finished(int,QProcess::ExitStatus)),this,SLOT(slot_downloadFinished(int, QProcess::ExitStatus)));
    //connect(&_p,SIGNAL(readyReadStandardError()),this,SLOT(slot_downloadError()));
    connect(&_p,SIGNAL(readyReadStandardOutput()),this,SLOT(slot_downloadOutput()));

    IC_SIZES
}

MIndexDir2::~MIndexDir2()
{
    delete ui;
}

void MIndexDir2::on_btClose_clicked()
{
    close();
}

QString MIndexDir2::targetDir() const
{
    return ui->wdgDir->targetDir();
}

void MIndexDir2::slot_downloadFinished(int , QProcess::ExitStatus )
{
    if(ui->wdgDir->curDir().isEmpty())
        ui->txtOutput->appendPlain(tr("Finished."));
    else
        ui->txtOutput->appendHtml(tr("Finished. View <a href=\"")+ui->wdgDir->curDir()+tr("#targetdirectory\">TARGET DIRECTORY</a>.<br>[")+ui->wdgDir->curDir()+"]");

    ui->txtOutput->goToBottom();
}

void MIndexDir2::slot_downloadError()
{
    ui->txtOutput->appendPlain(QString(QString::fromUtf8(_p.readAllStandardError())));
}

void MIndexDir2::slot_downloadOutput()
{
    ui->txtOutput->appendPlain(QString::fromUtf8(_p.readAllStandardOutput()));
}

void MIndexDir2::on_btStart_clicked()
{
    if(inProgress())
    {
        QMessageBox(QMessageBox::Information,tr("index directory"),tr("anoter process is running already"),QMessageBox::Close,this).exec();
        return;
    }

    ui->wdgDir->setCurDir();
    QString cmd(messages->settings().swishCmd()+" -v 3 -c \""+messages->settings().marcDir+QDir::separator()+"data/swish-e/swishconf_index\" -S fs -i \""+ui->wdgDir->curDir()+"\" -f \""+ui->wdgDir->curDir()+"/index.swish-e\"");

    messages->MsgMsg(tr("executing command '")+cmd+"' ...");

    ui->txtOutput->appendPlain(tr("executing command '")+cmd+"' ...");

    _p.start(cmd);
}

void MIndexDir2::on_btStop_clicked()
{
    //ui->txtOutput->append("closing process ...");
    if(inProgress())
    {
        ui->txtOutput->appendPlain(tr("INTERRUPTED by user, closing process ..."));
        _p.close();
    }
    else
        QMessageBox(QMessageBox::Information,tr("index directory"),tr("no running process"),QMessageBox::Close,this).exec();
}

void MIndexDir2::on_btClear_clicked()
{
    ui->txtOutput->clear();
}

void MIndexDir2::on_btVersion_clicked()
{
    if(inProgress())
    {
        QMessageBox(QMessageBox::Information,tr("index directory"),tr("anoter process is running already"),QMessageBox::Close,this).exec();
        return;
    }

    ui->wdgDir->cleanCurDir();
    QString cmd(messages->settings().swishCmd()+" -V");

    messages->MsgMsg(tr("executing command '")+cmd+"' ...");

    ui->txtOutput->appendPlain(tr("executing command '")+cmd+"' ...");

    //_p.setWorkingDirectory(ui->wdgDir->targetDir());
    _p.start(cmd);
}

void MIndexDir2::on_btHelp_clicked()
{
    if(inProgress())
    {
        QMessageBox(QMessageBox::Information,tr("index directory"),tr("anoter process is running already"),QMessageBox::Close,this).exec();
        return;
    }

    ui->wdgDir->cleanCurDir();
    QString cmd(messages->settings().swishCmd()+" -h");

    messages->MsgMsg(tr("executing command '")+cmd+"' ...");

    ui->txtOutput->appendPlain(tr("executing command '")+cmd+"' ...");

    _p.start(cmd);
}

void MIndexDir2::on_btState_clicked()
{
    if(inProgress())
        ui->txtOutput->appendPlain(tr("STATE: in progress"));
    else
        ui->txtOutput->appendPlain(tr("STATE: stopped"));
    ui->txtOutput->goToBottom();
}

bool MIndexDir2::inProgress() const
{
    return _p.state()!=QProcess::NotRunning;
}

void MIndexDir2::closeEvent(QCloseEvent *event)
{
    if(inProgress())
    {
        if(QMessageBox(QMessageBox::Question,tr("index directory"),tr("Current operation will be terminated. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this).exec()==QMessageBox::Ok)
        {
            _p.close();
            event->accept();
        }
        else
        {
            preventClose()=true;
            event->ignore();
        }
    }
    else
        event->accept();
}

void MIndexDir2::on_wdgDir_viewInLibrary(QString dirname)
{
    lib.findHtmlItem(dirname);
    lib.activate();
}

void MIndexDir2::on_txtOutput_anchorClicked(QUrl url)
{
    //ui->textBrowser->append(url.toString());
    if(url.fragment()=="targetdirectory")
    {
        url.setFragment(QString::null);
        //ui->textBrowser->append(url.toString());
        on_wdgDir_viewInLibrary(url.toString());
    }
}
