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

#include "regexpbuilder.h"
#include "ui_regexpbuilder.h"


MRegExpBuilder::MRegExpBuilder(QString const & text,QComboBox * const target,bool const inmenu,QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MRegExpBuilder),
    target(target),
    inmenu(inmenu)
{
    ui->setupUi(this);

    if(inmenu)
        ui->btClose->hide();

    ui->txtReg->setText(text);

    IC_SIZES
    setMinimumHeight(height());
    setMaximumHeight(height());

    //ui->txtReg->setFocus();
}


MRegExpBuilder::~MRegExpBuilder()
{
    delete ui;
}

void MRegExpBuilder::on_btChar_clicked()
{
    ui->txtReg->insert(".");
    //ui->txtPReg->clear();
}

void MRegExpBuilder::on_btEsc_clicked()
{
    ui->txtReg->insert("\\");
}

void MRegExpBuilder::on_btGrp_clicked()
{
    ui->txtReg->insert("["+ui->txtPReg->text()+"]");
    ui->txtPReg->clear();
}

void MRegExpBuilder::on_btGrpN_clicked()
{
    ui->txtReg->insert("[^"+ui->txtPReg->text()+"]");
    ui->txtPReg->clear();
}

void MRegExpBuilder::on_btZM_clicked()
{
    ui->txtReg->insert(ui->txtPReg->text()+"*");
    ui->txtPReg->clear();
}

void MRegExpBuilder::on_bt1M_clicked()
{
    ui->txtReg->insert(ui->txtPReg->text()+"+");
    ui->txtPReg->clear();
}

void MRegExpBuilder::on_btZ1_clicked()
{
    ui->txtReg->insert(ui->txtPReg->text()+"?");
    ui->txtPReg->clear();
}

void MRegExpBuilder::on_btSeq1_clicked()
{
    ui->txtReg->insert("("+ui->txtPReg->text()+")");
    ui->txtPReg->clear();
}

void MRegExpBuilder::on_btSeq2_clicked()
{
    ui->txtReg->insert("|");
    //ui->txtPReg->clear();
}

void MRegExpBuilder::on_btSeq3_clicked()
{
    ui->txtReg->insert("(|)");
    //ui->txtPReg->clear();
}

void MRegExpBuilder::on_btOcc1_clicked()
{
    ui->txtReg->insert(ui->txtPReg->text()+"{}");
    ui->txtPReg->clear();
}

void MRegExpBuilder::on_btOcc2_clicked()
{
    ui->txtReg->insert(ui->txtPReg->text()+"{,}");
    ui->txtPReg->clear();
}

void MRegExpBuilder::on_btBeg_clicked()
{
    QString t(ui->txtReg->text());
    if(t.startsWith("^"))
        t.remove(0,1);
    else
        t.prepend("^");

    ui->txtReg->setText(t);
}

void MRegExpBuilder::on_btEnd_clicked()
{
    QString t(ui->txtReg->text());
    if(t.endsWith("$"))
        t.chop(1);
    else
        t.append("$");

    ui->txtReg->setText(t);
}

void MRegExpBuilder::on_btUpdate_clicked()
{
    target->setEditText(outputText());
    if(!inmenu)
        close();
}

QString MRegExpBuilder::outputText() const
{
    return ui->txtReg->text();
}

void MRegExpBuilder::on_btTest_clicked()
{
    QRegExp r(ui->txtReg->text());
    int p(r.indexIn(ui->txtTest->text()));
    if(p!=-1)
    {
        ui->txtTest->setSelection(p,r.matchedLength());
        ui->lblResult->setText("TRUE");
    }
    else
    {
        ui->txtTest->deselect();
        ui->lblResult->setText("FALSE");
    }
}

void MRegExpBuilder::on_txtReg_returnPressed()
{
    on_btUpdate_clicked();
}

void MRegExpBuilder::on_btClose_clicked()
{
    if(!inmenu)
        close();
}
