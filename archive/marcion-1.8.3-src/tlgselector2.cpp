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

#include "tlgselector2.h"
#include "ui_tlgselector2.h"

CTlgSelector2::CTlgSelector2(
        QString const & dir1,
        QString const & dir2,
        QString const & dir3,
        QWidget *parent) :
    QDialog(parent),
    ui(new Ui::CTlgSelector2)
{
    ui->setupUi(this);

    QString const * dirs[3]={&dir1,&dir2,&dir3};

    for(int y=0;y<=2;y++)
    {
        IbycusAuthTab at(dirs[y]->toStdString());
        for(int x=0;x<at.Count();x++)
        {
            ui->cmbCorpora->addItem(at.Name(x).c_str());
            corpora << QPair<ibystring_t,ibystring_t>(dirs[y]->toStdString(),at.Tag(x));
            corpora_id << x;
        }
    }
    //cmbCorpora->setCurrentIndex(0);

    on_cmbCorpora_activated(0);
}

CTlgSelector2::~CTlgSelector2()
{
    delete ui;
}

//

int CTlgSelector2::line() const{return ui->spnLine->value();}
int CTlgSelector2::chapter() const{return ui->spnChapter->value();}
int CTlgSelector2::verse() const{return ui->spnVerse->value();}
bool CTlgSelector2::utf() const {return ui->rbUtf->isChecked();}
QString CTlgSelector2::selected_corpora() const {return corpora[ui->cmbCorpora->currentIndex()].second.c_str();}

void CTlgSelector2::on_lstAuthor_clicked(QModelIndex )
{
    ui->lstWork->clear();

    int i=ui->lstAuthor->currentRow();
    IbycusTxtFile itxt(author[i].second,author[i].first);

    ui->lstWork->clear();
    for(int y=0;y<itxt.Count();y++)
        for(int x=0;x<itxt.Count(y);x++)
        {
            ui->lstWork->addItem(QString::number(y+1)+". "+itxt.Name(y,x).c_str());
            //work[]
        }
}

void CTlgSelector2::on_cmbCorpora_activated(int index)
{
    ui->lstAuthor->clear();
    ui->lstWork->clear();
    author.clear();

    int i;
    if((i=index)!=-1)
    {
        IbycusAuthTab at(corpora[i].first);

        for(int x=0;x<at.Count(corpora_id[i]);x++)
        {
            author << QPair<ibystring_t,ibystring_t>(corpora[i].first,at.Id(corpora_id[i],x));
            ui->lstAuthor->addItem(at.Name(corpora_id[i],x).c_str());
        }
    }
}
QPair<ibystring_t,ibystring_t> const & CTlgSelector2::selected_author() const
{
    return author[ui->lstAuthor->currentRow()];
}
int CTlgSelector2::selected_work() const
{
    return ui->lstWork->currentRow();
}
void CTlgSelector2::on_btCancel_clicked()
{
    reject();
}

void CTlgSelector2::on_btOk_clicked()
{
    if(ui->lstWork->currentRow()!=-1)
        accept();
    else
        QMessageBox(QMessageBox::Warning,"warning","No work selected.",QMessageBox::Close,this).exec();
}
