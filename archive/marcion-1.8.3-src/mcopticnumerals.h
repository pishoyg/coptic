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

#ifndef MCOPTICNUMERALS_H
#define MCOPTICNUMERALS_H

#include <QWidget>
//#include <QIntValidator>
#include <QKeyEvent>

#include "ctranslit.h"
#include "settings.h"

namespace Ui {
    class MCopticNumerals;
}

class MCopticNumerals : public QWidget
{
    Q_OBJECT

public:
    explicit MCopticNumerals(QWidget *parent = 0,bool as_embedded=false);
    ~MCopticNumerals();

    static QString coptNumToArabNum(QString const & coptNum);
    static QString arabNumToCoptNum(QString const & arabNum);
    static QString greekNumToArabNum(QString const & greekNum);
    static unsigned int greekShNumToArabNum(QString const & greekNum);
    static QString arabNumToGreekNum(QString const & arabNum);
    static QString arabShNumToGreekNum(unsigned int arabNum);
    static QString arabNumToHebrewNum(QString const & arabNum);
    static QString arabShNumToHebrewNum(unsigned int arabNum,bool modern);
    static QString hebrewNumToArabNum(QString const & hebrewNum);
    static int hebrewShNumToArabNum(QString const & hebrewNum);
    static QString arabNumToCopticNumLit(unsigned int arabNum,bool male);

    static QString arabNumToRomanNum(unsigned int arabNum, QString * full_roman=0, QString * st_roman=0);
    static QString romanNumToArabNum(QString const & romanNum);

    void convertNumber(QString const & number);
private slots:
    void on_btConvert_clicked();

    void on_btClose_clicked();
    void on_wdgInput_query();
    void on_wdgInputGk_query();
    void on_wdgInputHb_query();

    void on_btClear_clicked();
    void on_spnInput_editingFinished();

protected:
    //void keyPressEvent ( QKeyEvent * event );
private:
    Ui::MCopticNumerals *ui;
    //QIntValidator _intval;

    static QStringList pw1m,pw1f,pw1m_t,pw1f_t,pw2m,pw2f,pw2mf_p;
    static bool isPower(unsigned int power,QString const & s,unsigned int & output);
    static unsigned int pow10(unsigned int p);
};

#endif // MCOPTICNUMERALS_H
