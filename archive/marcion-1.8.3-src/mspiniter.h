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

#ifndef MSPINITER_H
#define MSPINITER_H

#include <QWidget>
#include <QSpinBox>

namespace Ui {
class MSpinIter;
}

class MSpinIter : public QWidget
{
    Q_OBJECT

public:
    enum ValChngSender{Button,Routine,Edit};
    explicit MSpinIter(QWidget *parent = 0);
    ~MSpinIter();

    int currentValue() const;
    int minValue() const;
    int maxValue() const;

    void setMaximumValue(int maximum);
    void setMinimumValue(int minimum);
    void setCurrentValue(int new_value);

    void initSpecShorcuts();
    void setLastVerseActive(bool enabled);

public slots:
    void on_tbNext_clicked();
    void on_tbPrev_clicked();
private slots:
    void on_tbFirst_clicked();
    void on_tbLast_clicked();
    void on_spinBox_editingFinished();

private:
    Ui::MSpinIter *ui;

    void updateButtons();
signals:
    void valueChanged(int new_value, int invoker);
};

#endif // MSPINITER_H
