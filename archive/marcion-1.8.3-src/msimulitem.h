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

#ifndef MSIMULITEM_H
#define MSIMULITEM_H

#include <QWidget>
#include <QTreeWidgetItem>

#include "settings.h"

namespace Ui {
class MSimulItem;
}

class MSimulItem : public QWidget
{
    Q_OBJECT

public:
    enum Action{Close,Change};
    explicit MSimulItem(QString const & label,int id,int text_format,int script,QWidget *parent = 0);
    ~MSimulItem();

    QString bookLabel() const {return _label;}
    int bookId() const {return _id;}
    int textFormat() const {return _text_format;}
    int textScript() const {return _script;}
    int chapterOffset() const, verseOffset() const;
private:
    Ui::MSimulItem *ui;

    QString const _label;
    int const _id, _text_format,_script;
signals:
    void action(int);
public slots:
    void on_tbRemove_clicked();
private slots:
    void on_spnChOffset_valueChanged(int );
    void on_spnVOffset_valueChanged(int );
};

#endif // MSIMULITEM_H
