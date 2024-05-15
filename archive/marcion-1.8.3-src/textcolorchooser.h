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

#ifndef TEXTCOLORCHOOSER_H
#define TEXTCOLORCHOOSER_H

#include <QWidget>
#include <QColorDialog>
#include <QColor>

namespace Ui {
    class CTextColorChooser;
}

class CTextColorChooser : public QWidget {
    Q_OBJECT
public:
    enum Buttons{Both,Foreground,Background};

    CTextColorChooser(QWidget *parent = 0);
    ~CTextColorChooser();
    void init(QString const & foreg, QString const & backg, QString const & text,Buttons buttons=Both);
    QString fgColor() const,bgColor() const;
    QColor fgC() const,bgC() const;
protected:

private:
    Ui::CTextColorChooser *ui;

    void updateColors();
    QString text;
    QColor bgc,fgc;
private slots:
    void on_btHTBg_clicked();
    void on_btHTFg_clicked();
signals:
    void bgColorSelected(QColor);
};

#endif // TEXTCOLORCHOOSER_H
