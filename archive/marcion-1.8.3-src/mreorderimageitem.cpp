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

#include "mreorderimageitem.h"
#include "ui_mreorderimageitem.h"

MReorderImageItem::MReorderImageItem(int id,QWidget *parent) :
    QDialog(parent),
    ui(new Ui::MReorderImageItem)
{
    ui->setupUi(this);
    readItems(id);
    adjustSize();
}

MReorderImageItem::~MReorderImageItem()
{
    delete ui;
}

void MReorderImageItem::readItems(int id)
{
    QString query("select `name`,`id` from `image` where `collection`="+QString::number(id)+" order by `ord`");
    MQUERY(q,query)
    while(q.next())
    {
        MMapItem * i=new MMapItem(q.value(1));
        i->setText(q.value(0));
        ui->lstItems->addItem(i);
    }
}

int MReorderImageItem::itemCount() const
{
    return ui->lstItems->count();
}

MMapItem & MReorderImageItem::itemAt(int index) const
{
    return *(MMapItem*)ui->lstItems->item(index);
}
