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

#ifndef TBLDESIGNER_H
#define TBLDESIGNER_H

#include <QDialog>
#include <QAbstractButton>
#include <QTreeWidgetItem>
#include <QColorDialog>

namespace Ui {
    class CTblDesigner;
}

class CTblPropItem{
public:
    enum Type{
        Color,Number,Text
    };

    CTblPropItem();
    CTblPropItem(QString const &,QString const &,QString const &,QString const &,QString const &,Type);
    ~CTblPropItem();

    QString _t,_p,_dn,_tv,_v;
    Type _type;
};

class CTblDesigner : public QDialog {
    Q_OBJECT
public:
    enum Type
    {
        BookT,
        BookR,
        LibSearch
    };
    CTblDesigner(QWidget *parent = 0);
    ~CTblDesigner();

    bool init(Type type,QString const &);
    void createHtml();
    QString html() const {return _html;}
    QString values() const;

protected:
    void changeEvent(QEvent *e);

private:
    Ui::CTblDesigner *ui;

    static QString const _bt,_br,_lsr;
    QList<CTblPropItem> _prop;

    Type _type;
    QString _html;

private slots:
    void on_trwProp_itemDoubleClicked(QTreeWidgetItem* item, int column);
    void on_buttonBox_clicked(QAbstractButton* button);
};

#endif // TBLDESIGNER_H
