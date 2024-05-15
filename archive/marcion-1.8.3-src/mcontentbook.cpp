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

#include "mcontentbook.h"
#include "ui_mcontentbook.h"

MContentBook::MContentBook(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MContentBook),
    _popup()
{
    ui->setupUi(this);

    setWindowTitle(tr("Latin grammar"));
    ui->book->init(windowTitle(),QDir::toNativeSeparators("data/grammar/bennett/lg.htm"),CBookTextBrowser::Latin,QString(),true);

    ui->treeContent->setFont(m_sett()->latinFont());
    ui->treeContent->setColumnHidden(1,true);
    ui->book->disableCharset();

    a_go=_popup.addAction(tr("go to ..."));
    _popup.addSeparator();
    a_exp=_popup.addAction(tr("expand"));
    a_col=_popup.addAction(tr("collapse"));
    a_expall=_popup.addAction(tr("expand all"));
    a_colall=_popup.addAction(tr("collapse all"));

    initContent();

    IC_SIZES
}

MContentBook::~MContentBook()
{
    RM_WND;
    delete ui;
}

//

void MContentBook::initContent()
{
    //USE_CLEAN_WAIT

    for(int x=0;x<ui->treeContent->topLevelItemCount();x++)
        getItems(ui->treeContent->topLevelItem(x));

}

void MContentBook::getItems(QTreeWidgetItem * item)
{
    QString t1(item->text(0)),t2(item->text(1));
    t2=t2.trimmed();
    item->setToolTip(0,t1);
    if(!t2.isEmpty())
    {
        QFont f(item->font(0));
        f.setItalic(true);
        f.setUnderline(true);
        item->setFont(0,f);
    }
    /*if(t2.isEmpty())
        item->setFlags(Qt::ItemIsSelectable|Qt::ItemIsUserCheckable);
    else
        item->setFlags(Qt::ItemIsSelectable|Qt::ItemIsUserCheckable|Qt::ItemIsEnabled);*/

    for(int x=0;x<item->childCount();x++)
        getItems(item->child(x));
}

void MContentBook::on_treeContent_itemDoubleClicked(QTreeWidgetItem *item, int )
{
    if(item)
    {
        QString s(item->text(1));
        s.remove(QRegExp("^#"));
        if(!s.isEmpty())
            ui->book->browser()->browser()->scrollToAnchor(s);
    }
}

void MContentBook::on_treeContent_customContextMenuRequested(const QPoint &)
{

    QTreeWidgetItem * i=ui->treeContent->currentItem();
    if(i)
    {
        QString s=i->text(1);
        s=s.trimmed();
        a_go->setEnabled(!s.isEmpty());
    }
    else
    {
        a_go->setEnabled(false);
    }

    a_col->setEnabled(i);
    a_exp->setEnabled(i);

    QAction * a=_popup.exec(QCursor::pos());
    if(a==a_go)
    {
        if(i)
            on_treeContent_itemDoubleClicked(i,0);
    }
    else if(a==a_colall)
        ui->treeContent->collapseAll();
    else if(a==a_expall)
        ui->treeContent->expandAll();
    else if(a==a_exp&&i)
        i->setExpanded(true);
    else if(a==a_col&&i)
        i->setExpanded(false);
}
