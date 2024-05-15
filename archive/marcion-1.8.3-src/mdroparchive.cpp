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

#include "mdroparchive.h"
#include "ui_mdroparchive.h"

MDropArchive::MDropArchive(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::MDropArchive)
{
    ui->setupUi(this);

    adjustSize();
    setMinimumSize(size());
    setMaximumSize(size());
}

MDropArchive::~MDropArchive()
{
    delete ui;
}

QString MDropArchive::dropAuthors(bool for_sql) const
{
    if(ui->cbAuth->isChecked())
    {
        if(for_sql)
            return "true";
        else
            return tr("YES");
    }
    else
    {
        if(for_sql)
            return "false";
        else
            return tr("NO");
    }
}

QString MDropArchive::dropCategories(bool for_sql) const
{
    if(ui->cbCat->isChecked())
    {
        if(for_sql)
            return "true";
        else
            return tr("YES");
    }
    else
    {
        if(for_sql)
            return "false";
        else
            return tr("NO");
    }
}
