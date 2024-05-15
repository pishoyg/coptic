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

#ifndef TREECOMBOBOX_H
#define TREECOMBOBOX_H

#include <QComboBox>
#include <QMenu>
#include <QAction>

class CTreeComboBox : public QComboBox
{
    Q_OBJECT
public:
    explicit CTreeComboBox(QWidget *parent = 0);

    void appendBranch(QString const & branch,QIcon const & icon=QIcon());
    void appendItemToLastBranch(QString const & item,int uniq,const QVariant & userData = QVariant(),QIcon const & icon=QIcon());
    void appendSingle(QString const & item,int uniq,const QVariant & userData = QVariant());
    void showPopup();
    void hidePopup();
    void clear();
    void setFont(QFont const &);
    int currentOrigId() const;
    void setOrigId(int uniq);
private:
    QMenu newmenu;
    //QList<QMenu> menulist;
    QMenu * lastadded;
    QFont lfont;

    QList<int> uniq_id;
signals:
    //void contentChanged();
public slots:

};

#endif // TREECOMBOBOX_H
