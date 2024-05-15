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

#include "reorder.h"
#include "ui_reorder.h"
//

CReorder::CReorder(  QString title, int RowCount,
	QString const & word,
    QWidget * parent)
    : QDialog(parent),
	Delete(),Reorder(),
    ui(new Ui::dlgReorder),
	delete_all(false),iter(0)
{
    ui->setupUi(this);

	setWindowTitle(title);
    ui->tblDerivations->setRowCount(RowCount);
    ui->lblWord->setText((CTranslit::to(word,CTranslit::Copt)).left(20));
}

CReorder::~CReorder()
{
    delete ui;
}

//

void CReorder::setFont(QFont const & f)
{
    ui->lblWord->setFont(f);
    ui->tblDerivations->setFont(f);
}

void CReorder::appendItem(QString word,
	QString key,
	QString pos )
{
    ui->tblDerivations->setItem(iter,0,new QTableWidgetItem(word));
    ui->tblDerivations->setItem(iter,1,new QTableWidgetItem(key));
    ui->tblDerivations->setItem(iter,2,new QTableWidgetItem(pos));
    ui->tblDerivations->setItem(iter++,3,new QTableWidgetItem("reorder"));
}

void CReorder::on_btOk_clicked()
{
    for(int x=0;x<ui->tblDerivations->rowCount();x++)
        if(ui->tblDerivations->item(x,3)->text()=="reorder")
            Reorder.append(ui->tblDerivations->item(x,1)->text());
        else if(ui->tblDerivations->item(x,3)->text()=="DELETE")
            Delete.append(ui->tblDerivations->item(x,1)->text());

	accept();
}

void CReorder::on_btStorno_clicked()
{
	reject();
}

void CReorder::on_btDel_clicked()
{
    QList<QTableWidgetItem*> l(ui->tblDerivations->selectedItems());
	for(int x=0;x<l.size();x++)
        if(ui->tblDerivations->column(l.at(x))==3)
			l.at(x)->setText("DELETE");
}

void CReorder::on_btDelWord_clicked()
{
    ui->tblDerivations->setEnabled(false);
	delete_all=true;
}
bool CReorder::deleteAll() const
{
	return delete_all;
}
void CReorder::on_btDown_clicked()
{
    QList<QTableWidgetItem*> l(ui->tblDerivations->selectedItems());

    int first=ui->tblDerivations->row(l.first()),
        last=ui->tblDerivations->row(l.last());

    if(last!=ui->tblDerivations->rowCount()-1)
	{
        ui->tblDerivations->insertRow(first);
        ui->tblDerivations->setItem(first,0,
        new QTableWidgetItem(*ui->tblDerivations->item(last+2,0)));
        ui->tblDerivations->setItem(first,1,
        new QTableWidgetItem(*ui->tblDerivations->item(last+2,1)));
        ui->tblDerivations->setItem(first,2,
        new QTableWidgetItem(*ui->tblDerivations->item(last+2,2)));
        ui->tblDerivations->setItem(first,3,
        new QTableWidgetItem(*ui->tblDerivations->item(last+2,3)));

        ui->tblDerivations->removeRow(last+2);
	}
}

void CReorder::on_btUp_clicked()
{
    QList<QTableWidgetItem*> l(ui->tblDerivations->selectedItems());

    int first=ui->tblDerivations->row(l.first()),
        last=ui->tblDerivations->row(l.last());

	if(first!=0)
	{
        ui->tblDerivations->insertRow(last+1);
        ui->tblDerivations->setItem(last+1,0,
        new QTableWidgetItem(*ui->tblDerivations->item(first-1,0)));
        ui->tblDerivations->setItem(last+1,1,
        new QTableWidgetItem(*ui->tblDerivations->item(first-1,1)));
        ui->tblDerivations->setItem(last+1,2,
        new QTableWidgetItem(*ui->tblDerivations->item(first-1,2)));
        ui->tblDerivations->setItem(last+1,3,
        new QTableWidgetItem(*ui->tblDerivations->item(first-1,3)));

        ui->tblDerivations->removeRow(first-1);
	}
}
