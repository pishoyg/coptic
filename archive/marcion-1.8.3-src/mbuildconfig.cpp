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

#include "mbuildconfig.h"
#include "ui_mbuildconfig.h"

MBuildConfig::MBuildConfig(QTranslator * qtTr, QString const & dirname, QWidget *parent) :
    QWizard(parent),
    ui(new Ui::MBuildConfig),
    qtTr(qtTr),
    /*is_tr_loaded(false),*/
    dirname(dirname),
    _interrupted(false)
{
    ui->setupUi(this);
    setPixmap(QWizard::LogoPixmap,QPixmap(":/new/icons/icons/mlogo4.png"));
    setPixmap(QWizard::WatermarkPixmap,QPixmap(":/new/icons/icons/wmark.png"));

    on_cbAppFont_toggled(ui->cbAppFont->isChecked());

    adjustSize();
    /*setMinimumSize(size());
    setMaximumSize(size());*/
}

MBuildConfig::~MBuildConfig()
{
    delete ui;
}

QFont MBuildConfig::appFont() const
{
    QFont f(ui->fntAppFont->currentFont());
    f.setPointSize(ui->spnAppFSize->value());
    return f;
}

bool MBuildConfig::trayIcon() const
{
    return ui->cbTrayIcon->isChecked();
}

bool MBuildConfig::scanClipboard() const
{
    return ui->cbScanClipboard->isChecked();
}

bool MBuildConfig::tipAtStartup() const
{
    return ui->cbTip->isChecked();
}

int MBuildConfig::language() const
{
    return ui->cmbLang->currentIndex();
}

bool MBuildConfig::useAppFont() const
{
    return ui->cbAppFont->isChecked();
}

void MBuildConfig::on_cbAppFont_toggled(bool checked)
{
    if(!checked)
    {
        ui->fntAppFont->setCurrentFont(QApplication::font());
        ui->spnAppFSize->setValue(QApplication::font().pointSize());
    }

    ui->fntAppFont->setEnabled(checked);
    ui->spnAppFSize->setEnabled(checked);
}

void MBuildConfig::on_cmbLang_currentIndexChanged(int index)
{
    if(index!=0)
    {
        /*if(!is_tr_loaded)
        {*/
            QString trname(dirname+QDir::separator()+"data"+QDir::separator()+"lang"+QDir::separator()+"marcion_"),lapp;

            switch(index)
            {
            case 1 : // czech
                lapp="cs";
                break;
            /*case 2 : // greek
                lapp="el";
                break;
            case 3 : // german
                lapp="de";
                break;*/
            }
            trname.append(lapp);

            if(!qtTr->load(trname))
            {
                QMessageBox(QMessageBox::Critical,"language setting","cannot load "+lapp+" language, file '"+trname+"'").exec();
                return;
            }
            /*is_tr_loaded=true;
        }*/
        QApplication::installTranslator(qtTr);

    }
    else
    {
        QApplication::removeTranslator(qtTr);
    }

    ui->retranslateUi(this);
}

void MBuildConfig::on_fntAppFont_currentFontChanged(QFont f)
{
    f.setPointSize(ui->spnAppFSize->value());
    setFont(f);
}

void MBuildConfig::on_spnAppFSize_valueChanged(int v)
{
    QFont f(ui->fntAppFont->currentFont());
    f.setPointSize(v);
    setFont(f);
}

void MBuildConfig::on_cbTLG_w_toggled(bool checked)
{
    ui->wdgTLG_w->setEnabled(checked);
}

bool MBuildConfig::isTlgEnabled() const
{
    return ui->cbTLG_w->isChecked();
}

QString MBuildConfig::dir1() const
{
    return ui->txtDir1_w->text();
}

QString MBuildConfig::dir2() const
{
    return ui->txtDir2_w->text();
}

QString MBuildConfig::dir3() const
{
    return ui->txtDir3_w->text();
}

bool MBuildConfig::isInterrupted() const
{
    return _interrupted;
}

bool MBuildConfig::isSimpleSplash() const
{
    return ui->rbSplashSimple->isChecked();
}

void MBuildConfig::closeEvent ( QCloseEvent * e )
{
    QMessageBox b(QMessageBox::Warning,tr("Marcion | config"),tr("Basic configuration is incomplete. Default values will be used. Continue?"),QMessageBox::Ok|QMessageBox::Cancel|QMessageBox::Abort,this);
    int r=b.exec();
    switch(r)
    {
    case QMessageBox::Ok :
        e->accept();
        break;
    case QMessageBox::Cancel :
        e->ignore();
        break;
    case QMessageBox::Abort :
        _interrupted=true;
        e->accept();
        break;
    }
}
