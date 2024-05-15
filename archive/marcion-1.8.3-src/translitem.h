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

#ifndef TRANSLITEM_H
#define TRANSLITEM_H

#include <QWidget>

namespace Ui {
    class CTranslItem;
}

class CTranslItem : public QWidget {
    Q_OBJECT
public:
    enum Lang{English,Czech};
    CTranslItem(Lang lang,QFont const &,int column,bool extra,int extend=1,QWidget *parent = 0);
    ~CTranslItem();

    QString selectedWord() const;
    QString coptDictId() const;

    void addItem(QString const &);
    void addItem2(QString const &,int,QString const &,bool);
    void selectItem(int);
    void clear();
    bool isExtra() const {return extra;}
    int extend() const {return _extend;}
    int column() const {return _column;}
    void setColumn(int column){_column=column;}
    void setFont(const QFont &);
    //void findOrigId(QString const &);

    int currentOrigId() const;
    void setOrigId(int);
    bool isSelGroupGreek() const;
protected:
    void changeEvent(QEvent *e);

private:
    Ui::CTranslItem *ui;

    Lang const lang;
    int _column;
    int const _extend;
    bool const extra;
private slots:
    void on_cmbWords_currentIndexChanged(int index);
    void on_btRefresh_clicked();
signals:
    void refreshRequested(CTranslItem::Lang,int,bool);
    void wordChanged(CTranslItem::Lang,int,int,bool);
};

#endif // TRANSLITEM_H
