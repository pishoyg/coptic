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

#ifndef MWINDOWSWIDGET_H
#define MWINDOWSWIDGET_H

#include <QWidget>
#include <QMenu>
#include <QTreeWidgetItem>
#include <QToolButton>

#define RM_WND m_sett()->wnds()->removeWindow(this)

class MWndAction : public QAction
{
public:
    MWndAction(QWidget * wdg):QAction(0),_wdg(wdg){}
    ~MWndAction(){}

    QWidget * _wdg;
};

class MWndListItem : public QTreeWidgetItem
{
public:
    MWndListItem(QIcon const & icon,QString const & title,QWidget * wdg);
    ~MWndListItem(){}

    QWidget * _wdg;
};

namespace Ui {
class MWindowsWidget;
}

class MWindowsWidget : public QWidget
{
    Q_OBJECT

public:
    explicit MWindowsWidget(QToolButton * bt1,
                            QToolButton * bt2,
                            QWidget *parent = 0);
    ~MWindowsWidget();

    void addNewWindow(QWidget * w);
    void removeWindow(QWidget * w);
    static void activateOne(QWidget * w);

    void buildList(QMenu * wnd_menu) const;
private slots:
    void slot_closeSelected();
    void slot_activateSelected();

    void on_treeBooks_itemSelectionChanged();
    void on_treeBooks_customContextMenuRequested(const QPoint &pos);
    void on_treeBooks_itemChanged(QTreeWidgetItem *item, int column);
    void on_treeBooks_itemDoubleClicked(QTreeWidgetItem *item, int column);

private:
    Ui::MWindowsWidget *ui;
    QToolButton * const _remove,*_activate;

    QTreeWidgetItem * last_edited;
    QMenu popup;
    QAction *a_act,*a_close,*a_chtit,*a_rmall;
};

#endif // MWINDOWSWIDGET_H
