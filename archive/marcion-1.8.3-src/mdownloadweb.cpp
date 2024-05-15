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

#include "mdownloadweb.h"
#include "ui_mdownloadweb.h"

MDownloadWeb::MDownloadWeb(
        CMessages * const messages,
        QDir const & dir,
        CLibBase & lib,
        QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MDownloadWeb),
    messages(messages),
    _p(),
    test(false),epars(),
    lib(lib)
{
    ui->setupUi(this);

    ui->wdgDir->init(messages,tr("into directory"),dir);

    connect(&_p,SIGNAL(finished(int,QProcess::ExitStatus)),this,SLOT(slot_downloadFinished(int, QProcess::ExitStatus)));
    connect(&_p,SIGNAL(readyReadStandardError()),this,SLOT(slot_downloadError()));
    connect(&_p,SIGNAL(readyReadStandardOutput()),this,SLOT(slot_downloadOutput()));

    on_btDefault_clicked();

    ui->btDetails->setChecked(false);
    on_btDetails_toggled(false);

    ui->treeSites->hideColumn(1);
    ui->treeSites->hide();

    IC_SIZES
}

MDownloadWeb::~MDownloadWeb()
{
    delete ui;
}

QString MDownloadWeb::webLoc() const
{
    return ui->txtUrl->text();
}

void MDownloadWeb::on_btStart_clicked()
{
    if(inProgress())
    {
        QMessageBox(QMessageBox::Information,tr("download web"),tr("anoter process is running already"),QMessageBox::Close,this).exec();
        return;
    }

    ui->wdgDir->cleanCurDir();
    QString cmd;

    if(!test)
    {
        cmd=ui->txtCmd->text()+" "+ui->txtParams->text()+" "+webLoc();
        ui->wdgDir->setCurDir();
    }
    else
        cmd=ui->txtCmd->text()+" "+epars;

    messages->MsgMsg(tr("executing command '")+cmd+tr("', working directory: '")+ui->wdgDir->curDir()+"' ...");
    ui->textBrowser->appendPlain(tr("executing command '")+cmd+tr("', working directory: '")+ui->wdgDir->curDir()+"' ...");

    test=false;
    _p.setWorkingDirectory(ui->wdgDir->curDir());
    _p.start(cmd);
}

void MDownloadWeb::slot_downloadFinished(int , QProcess::ExitStatus )
{
    /*if(exitCode==0)
        ui->textBrowser->append("Success!");
    else
        ui->textBrowser->append("ERROR!");*/

    if(ui->wdgDir->curDir().isEmpty())
        ui->textBrowser->appendPlain(tr("Finished."));
    else
        ui->textBrowser->appendHtml(tr("Finished. View <a href=\"")+ui->wdgDir->curDir()+tr("#targetdirectory\">TARGET DIRECTORY</a>.<br>[")+ui->wdgDir->curDir()+"]");

    ui->textBrowser->goToBottom();

}

void MDownloadWeb::slot_downloadError()
{
    ui->textBrowser->appendPlain(QString(QString::fromUtf8(_p.readAllStandardError())));
}

void MDownloadWeb::slot_downloadOutput()
{
    ui->textBrowser->appendPlain(QString::fromUtf8(_p.readAllStandardOutput()));
}

void MDownloadWeb::on_btStop_clicked()
{
    //ui->textBrowser->append("closing process ...");
    if(inProgress())
    {
        ui->textBrowser->appendPlain(tr("INTERRUPTED by user, closing process ..."));
        _p.close();
    }
    else
        QMessageBox(QMessageBox::Information,tr("download web"),tr("no running process"),QMessageBox::Close,this).exec();
}

void MDownloadWeb::on_btClear_clicked()
{
    ui->textBrowser->clear();
}

/*void MDownloadWeb::on_btChooseDir_clicked()
{
    QFileDialog fd(this,"download web",ui->txtDir->text());
    fd.setFileMode(QFileDialog::Directory);

    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
            ui->txtDir->setText(fd.selectedFiles().first());
    }
}*/

/*bool MDownloadWeb::isDirUnchanged() const
{
    return _dir==QDir(ui->txtDir->text());
}*/

QString MDownloadWeb::targetDir() const
{
    return ui->wdgDir->targetDir();
}

/*void MDownloadWeb::on_txtDir_textChanged(QString t)
{
    if(QDir(t).absolutePath().startsWith(_libdir.absolutePath()))
        ui->lblWarn->setText(QString("<span style=\"color: blue;\">This directory can be shown in Marcion's library.</span>"));
    else
        ui->lblWarn->setText(QString("<span style=\"color: red;\">Warning: This directory is outside of Marcion's 'library' directory.</span>"));
}*/

void MDownloadWeb::on_btTest_clicked()
{
    test=true;
    epars=ui->txtHelp->text();
    on_btStart_clicked();
}

void MDownloadWeb::on_btDefault_clicked()
{
    ui->txtCmd->setText(messages->settings().wgetCmd());
    ui->txtParams->setText(ui->rbWeb->isChecked()?QString("-nv -m -k -np"):QString());
    ui->txtHelp->setText("--help");
    ui->txtVersion->setText("--version");
}

void MDownloadWeb::on_btDetails_toggled(bool checked)
{
    ui->frmDetails->setVisible(checked);
}

void MDownloadWeb::on_btVersion_clicked()
{
    test=true;
    epars=ui->txtVersion->text();
    on_btStart_clicked();
}

void MDownloadWeb::on_btRec_clicked(bool checked)
{
    ui->treeSites->setVisible(checked);
}

void MDownloadWeb::on_treeSites_currentItemChanged(QTreeWidgetItem* current, QTreeWidgetItem* )
{
    if(current)
        if(current->parent())
        {
            ui->txtUrl->setText("http://"+current->text(0));
            (current->text(1)==QString("web")?ui->rbWeb:ui->rbFile)->setChecked(true);
        }
}

void MDownloadWeb::on_rbWeb_toggled(bool )
{
    on_btDefault_clicked();
}

void MDownloadWeb::on_rbFile_toggled(bool )
{
    on_btDefault_clicked();
}

void MDownloadWeb::on_btBrowse_clicked()
{
     m_sett()->execBrowser(QUrl(ui->txtUrl->text()));
}

void MDownloadWeb::on_btState_clicked()
{
    if(inProgress())
        ui->textBrowser->appendPlain(tr("STATE: in progress"));
    else
        ui->textBrowser->appendPlain(tr("STATE: stopped"));
    ui->textBrowser->goToBottom();
}

bool MDownloadWeb::inProgress() const
{
    return _p.state()!=QProcess::NotRunning;
}

void MDownloadWeb::closeEvent(QCloseEvent *event)
{
    if(inProgress())
    {
        if(QMessageBox(QMessageBox::Question,tr("download web"),tr("Current operation will be terminated. Continue?"),QMessageBox::Yes|QMessageBox::Cancel,this).exec()==QMessageBox::Yes)
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

void MDownloadWeb::on_btClose_clicked()
{
    close();
}

void MDownloadWeb::on_wdgDir_viewInLibrary(QString dirname)
{
    lib.findHtmlItem(dirname);
    lib.activate();
}

void MDownloadWeb::on_textBrowser_anchorClicked(QUrl url)
{
    //ui->textBrowser->append(url.toString());
    if(url.fragment()=="targetdirectory")
    {
        url.setFragment(QString::null);
        //ui->textBrowser->append(url.toString());
        on_wdgDir_viewInLibrary(url.toString());
    }
}
