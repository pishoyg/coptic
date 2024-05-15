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

#include "meditimgitem.h"
#include "ui_meditimgitem.h"

MEditImgItem::MEditImgItem(QString const & name,QString const & file,QList<double> const & coords,short from_age,short to_age,bool collection,QWidget *parent) :
    QDialog(parent),
    ui(new Ui::MEditImgItem)
{
    ui->setupUi(this);

    if(collection)
    {
        setWindowTitle(tr("update collection"));

        ui->frBook->hide();
        ui->txtColName->setText(name);
        ui->txtColDir->setText(file);

        adjustSize();
        setMinimumHeight(height());
        setMaximumHeight(height());
    }
    else
    {
        setWindowTitle(tr("update map"));

        ui->frCol->hide();
        ui->txtBookName->setText(name);
        ui->txtBookFile->setText(file);

        ui->grpCoords->setChecked(!coords.isEmpty());

        if(coords.count()==4)
        {
            ui->spnLong1->setValue(coords.at(0));
            ui->spnLat1->setValue(coords.at(1));
            ui->spnLong2->setValue(coords.at(2));
            ui->spnLat2->setValue(coords.at(3));
        }

        ui->spnFromTime->setValue(from_age);
        ui->spnToTime->setValue(to_age);

        adjustSize();
        setMinimumHeight(height());
        setMaximumHeight(height());
    }
}

MEditImgItem::~MEditImgItem()
{
    delete ui;
}

QString MEditImgItem::dir() const
{
    return ui->txtColDir->text();
}

QString MEditImgItem::file() const
{
    return ui->txtBookFile->text();
}

QString MEditImgItem::colName() const
{
    return ui->txtColName->text();
}

QString MEditImgItem::bookName() const
{
    return ui->txtBookName->text();
}

bool MEditImgItem::isAreaChecked() const
{
    return ui->grpCoords->isChecked();
}

QString MEditImgItem::coords() const
{
    QString rv;
    rv.append(QString::number(ui->spnLong1->value(),'f',2)+";");
    rv.append(QString::number(ui->spnLat1->value(),'f',2)+";");
    rv.append(QString::number(ui->spnLong2->value(),'f',2)+";");
    rv.append(QString::number(ui->spnLat2->value(),'f',2)+";");
    rv.append(QString::number(ui->spnFromTime->value())+";");
    rv.append(QString::number(ui->spnToTime->value()));

    return rv;
}

void MEditImgItem::on_tbFromClipboard_clicked()
{
    QStringList const l(QApplication::clipboard()->text().split(";"));

    if(l.count()==4)
    {
        ui->spnLong1->setValue(l.at(0).toDouble());
        ui->spnLat1->setValue(l.at(1).toDouble());
        ui->spnLong2->setValue(l.at(2).toDouble());
        ui->spnLat2->setValue(l.at(3).toDouble());
    }
}
