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

#include "mlibtreewidget.h"

MLibTreeWidget::MLibTreeWidget(QWidget *parent) :
    QTreeWidget(parent)
{
}

void MLibTreeWidget::dropEvent ( QDropEvent * event )
{
    emit drop(itemAt(event->pos()));
}

void MLibTreeWidget::startDrag ( Qt::DropActions  )
{
    emit drag();
    QTreeWidget::startDrag(Qt::CopyAction);
}

void MLibTreeWidget::dragMoveEvent ( QDragMoveEvent * event )
{
    MLibTreeWidgetItem * i((MLibTreeWidgetItem*)itemAt(event->pos()));
    if(i)
    {
        setCurrentItem(i,0,QItemSelectionModel::NoUpdate);
        event->setAccepted(i->_is_dir);
    }
    else
        event->setAccepted(true);
}

// MLibTreeWidgetItem

MLibTreeWidgetItem::MLibTreeWidgetItem() :
    QTreeWidgetItem(QTreeWidgetItem::UserType),
    _is_dir(false),
    _is_symlink(false),
    _exist(false),
    _raw_name()
{
}
