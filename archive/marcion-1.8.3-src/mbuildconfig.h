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

#ifndef MBUILDCONFIG_H
#define MBUILDCONFIG_H

#include <QWizard>
#include <QTranslator>
#include <QDir>
#include <QMessageBox>
#include <QCloseEvent>

//#include "settings.h"

namespace Ui {
    class MBuildConfig;
}

class MBuildConfig : public QWizard
{
    Q_OBJECT

public:
    explicit MBuildConfig(QTranslator * qtTr, QString const & dirname, QWidget *parent = 0);
    ~MBuildConfig();

    QFont appFont() const;
    bool useAppFont() const;
    bool trayIcon() const;
    bool scanClipboard() const;
    bool tipAtStartup() const;
    int language() const;

    bool isTlgEnabled() const;
    QString dir1() const;
    QString dir2() const;
    QString dir3() const;
    bool isSimpleSplash() const;

    bool isInterrupted() const;
protected:
    void closeEvent ( QCloseEvent * e );
private:
    Ui::MBuildConfig *ui;
    QTranslator * qtTr;
    //bool is_tr_loaded;
    QString dirname;
    bool _interrupted;
private slots:
    void on_spnAppFSize_valueChanged(int );
    void on_fntAppFont_currentFontChanged(QFont f);
    void on_cmbLang_currentIndexChanged(int index);
    void on_cbAppFont_toggled(bool checked);
    void on_cbTLG_w_toggled(bool checked);
};

#endif // MBUILDCONFIG_H
