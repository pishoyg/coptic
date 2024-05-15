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

#include "mwindowswidget.h"
#include "ui_mwindowswidget.h"

MWindowsWidget::MWindowsWidget(QToolButton * bt1,
                               QToolButton * bt2,
                               QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MWindowsWidget),
    _remove(bt2),_activate(bt1),
    last_edited(0),
    popup()
{
    ui->setupUi(this);

    connect(_remove,SIGNAL(clicked()),this,SLOT(slot_closeSelected()));
    connect(_activate,SIGNAL(clicked()),this,SLOT(slot_activateSelected()));

    a_act=popup.addAction(QIcon(":/new/icons/icons/go.png"),tr("&activate"));
    a_close=popup.addAction(QIcon(":/new/icons/icons/delete.png"),tr("&remove"));
    a_chtit=popup.addAction(tr("&change title"));
    popup.addSeparator();
    a_rmall=popup.addAction(tr("r&emove all"));
}

MWindowsWidget::~MWindowsWidget()
{
    delete ui;
}

//

void MWindowsWidget::buildList(QMenu * wnd_menu) const
{
    wnd_menu->clear();
    if(ui->treeBooks->topLevelItemCount()<1)
    {
        QAction * a=wnd_menu->addAction(tr("(none)"));
        a->setEnabled(false);
    }
    else
        for(int x=0;x<ui->treeBooks->topLevelItemCount();x++)
        {
            MWndListItem * i=(MWndListItem*)ui->treeBooks->topLevelItem(x);
            MWndAction * ma=new MWndAction(i->_wdg);
            ma->setText(i->text(0));
            ma->setIcon(i->icon(0));
            wnd_menu->addAction(ma);
        }
}

void MWindowsWidget::addNewWindow(QWidget * w)
{
    MWndListItem * i=new MWndListItem(w->windowIcon(),w->windowTitle(),w);
    ui->treeBooks->addTopLevelItem(i);
}

void MWindowsWidget::removeWindow(QWidget * w)
{
    for(int x=0;x<ui->treeBooks->topLevelItemCount();x++)
    {
        MWndListItem * i=(MWndListItem*)ui->treeBooks->topLevelItem(x);
        if(w==i->_wdg)
        {
            QTreeWidgetItem * i2=ui->treeBooks->takeTopLevelItem(x);
            if(i2)
                delete i2;
            return;
        }
    }
}

void MWindowsWidget::slot_closeSelected()
{
    QList<QTreeWidgetItem*> l=ui->treeBooks->selectedItems();
    for(int x=0;x<l.count();x++)
    {
        MWndListItem * i=(MWndListItem*)l.at(x);
        delete i->_wdg;
    }
}

void MWindowsWidget::activateOne(QWidget * w)
{
    if(w)
    {
        w->show();
        w->activateWindow();
    }
}

void MWindowsWidget::slot_activateSelected()
{
    QList<QTreeWidgetItem*> l=ui->treeBooks->selectedItems();
    if(l.count()>0)
    {
        MWndListItem * i=(MWndListItem*)l.first();
        activateOne(i->_wdg);
    }
}

void MWindowsWidget::on_treeBooks_itemSelectionChanged()
{
    bool b(ui->treeBooks->selectedItems().count()>0);
    _activate->setEnabled(b);
    _remove->setEnabled(b);
}

void MWindowsWidget::on_treeBooks_customContextMenuRequested(const QPoint &)
{
    MWndListItem * i(0);
    QList<QTreeWidgetItem*> l(ui->treeBooks->selectedItems());
    if(l.count()>0)
        i=(MWndListItem*)l.first();
    a_chtit->setEnabled(i);
    a_close->setEnabled(i);
    a_act->setEnabled(i);
    a_rmall->setEnabled(ui->treeBooks->topLevelItemCount()>0);
    QAction * a=popup.exec(QCursor::pos());
    if(a)
    {
        if(a==a_chtit&&i)
        {
            last_edited=i;
            ui->treeBooks->editItem(i,0);
        }
        else if(a==a_close&&i)
        {
            slot_closeSelected();
        }
        else if(a==a_act&&i)
        {
            slot_activateSelected();
        }
        else if(a==a_rmall)
        {
            ui->treeBooks->selectAll();
            slot_closeSelected();
        }
    }
}

void MWindowsWidget::on_treeBooks_itemChanged(QTreeWidgetItem *item, int column)
{
    QTreeWidgetItem * le(last_edited);
    last_edited=0;
    if(column==0&&le&&item)
    {
        if(item==le)
        {
            MWndListItem * i((MWndListItem *)item);
            if(i->_wdg)
                i->_wdg->setWindowTitle(i->text(0));
        }
    }
}

void MWindowsWidget::on_treeBooks_itemDoubleClicked(QTreeWidgetItem *item, int )
{
    if(item)
        activateOne(((MWndListItem*)item)->_wdg);
}

// MWndListItem

MWndListItem::MWndListItem(QIcon const & icon,QString const & title,QWidget * wdg)
    :QTreeWidgetItem(0),
      _wdg(wdg)
{
    QTreeWidgetItem::setIcon(0,icon);
    QTreeWidgetItem::setText(0,title);
    QTreeWidgetItem::setToolTip(0,title);
    setFlags(Qt::ItemIsSelectable|Qt::ItemIsUserCheckable|Qt::ItemIsEnabled|Qt::ItemIsDragEnabled|Qt::ItemIsEditable);
}
