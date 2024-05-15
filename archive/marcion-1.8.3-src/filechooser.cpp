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

#include "filechooser.h"
#include "ui_filechooser.h"

MFileChooser::MFileChooser(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MFileChooser),
    usedDir(),
    _relative(false),
    messages(0)
{
    ui->setupUi(this);
}

MFileChooser::~MFileChooser()
{
    delete ui;
}

void MFileChooser::init(CMessages * const messages,QString const & dirtitle,QDir const & dir,bool goto_button_is_visible,bool show_info)
{
    ui->lblDirTitle->setText(dirtitle);
    CMessages ** m((CMessages **)&this->messages);
    *m=(CMessages *)messages;

    ui->txtDir->setText(relativeToLibrary(dir.absolutePath()));
    ui->btView->setVisible(goto_button_is_visible);
    ui->frmInfo->setVisible(show_info);
}

void MFileChooser::setRelativeToLibrary(bool is_relative)
{
    _relative=is_relative;
}

void MFileChooser::on_btChooseDir_clicked()
{
    QFileDialog fd(this,tr("target directory"),ui->txtDir->text());
    fd.setAcceptMode(QFileDialog::AcceptOpen);
    fd.setFileMode(QFileDialog::Directory);
    fd.setOption(QFileDialog::ShowDirsOnly,true);
    fd.setOption(QFileDialog::ReadOnly,true);

    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
            ui->txtDir->setText(relativeToLibrary(fd.selectedFiles().first()));
    }
}

void MFileChooser::on_txtDir_textChanged(QString t)
{
    static QDir const _libdir(QDir("library"));
    QFileInfo d(t);

    emit pathChanged(t);

    if(!d.exists())
    {
        ui->lblWarn->setText(QString(tr("<span style=\"color: red;\">Error:</span> Directory not exists!")));
        return;
    }
    else if(!d.isDir())
    {
        ui->lblWarn->setText(QString(tr("<span style=\"color: red;\">Error:</span> This is not a directory!")));
        return;
    }

    if(QDir::toNativeSeparators(QDir(t).canonicalPath()).startsWith(QDir::toNativeSeparators(_libdir.canonicalPath())))
    {
        if(_relative&&(d.isAbsolute()||!t.startsWith(QString("library")+QDir::separator())))
        {
            ui->lblWarn->setText(QString(tr("<span style=\"color: green;\">Warning:</span> This directory is not relative to Marcion's library!")));
            return;
        }

        ui->lblWarn->setText(QString(tr("<span style=\"color: blue;\">This directory is a subdirectory Marcion's library.</span>")));
    }
    else
        ui->lblWarn->setText(QString(tr("<span style=\"color: green;\">Warning:</span> This directory is outside of Marcion's library!")));
}

QString MFileChooser::targetDir(bool separators) const
{
    if(separators)
        return QDir::cleanPath(ui->txtDir->text());
    else
        return QDir::cleanPath(QDir::toNativeSeparators(ui->txtDir->text()));
}

void MFileChooser::setTargetDir(QString const & dir)
{
    ui->txtDir->setText(relativeToLibrary(dir));
}

void MFileChooser::on_btView_clicked()
{
    emit viewInLibrary(ui->txtDir->text());
}

void MFileChooser::setCurDir()
{
    usedDir=targetDir();
}

void MFileChooser::cleanCurDir()
{
    usedDir.clear();
}

QString MFileChooser::curDir()
{
    return usedDir;
}

QString MFileChooser::relativeToLibrary(QString const & path,bool relative)
{
    if(relative)
    {
        QFileInfo fip(path);
        /*if(QString::compare(fip.fileName(),"library",Qt::CaseSensitive)==0)
            return fip.fileName();*/
        QString s(QDir::toNativeSeparators(QDir(m_sett()->marcDir).absolutePath())+QDir::separator()),r(QDir::toNativeSeparators(fip.absoluteFilePath()));
        r.remove(QRegExp(QString("^")+QRegExp::escape(s)));
        return r;
    }
    else
        return path;
}

QString MFileChooser::relativeToLibrary(QString const & path)
{
    return relativeToLibrary(path,_relative);
}

void MFileChooser::on_cbEdit_clicked(bool checked)
{
    ui->txtDir->setReadOnly(!checked);
}

/*void MFileChooser::showMessage(QString const & message)
{
    ui->lblWarn->setText(ui->lblWarn->text()+"\n("+message+")");
}*/

bool MFileChooser::isInMLib(QString const & path)
{
    return QDir::toNativeSeparators(path).startsWith(QString("library")+QDir::separator());
}
