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

#ifndef MNOTEPAD_H
#define MNOTEPAD_H

#include <QMainWindow>
#include <QMessageBox>

#include "settings.h"
#include "msbeditwdg.h"
#include "mfontchooser.h"

namespace Ui {
class MNotepad;
}

class MNotepad : public QMainWindow
{
    Q_OBJECT

public:
    explicit MNotepad();
    ~MNotepad();

    bool loadFile(QString const & filename);
private slots:
    void on_actionSave_as_triggered();
    void on_actionSave_triggered();
    void on_actionOpen_triggered();
    void on_actionReload_triggered();
    void on_actionInsert_word_triggered(bool checked);
    void on_txtText_textChanged();
    void on_txtText_cursorPositionChanged();
    void on_btInsWord_clicked();
    void on_actionChange_font_triggered(bool checked);
    void on_tbHideWord_clicked();

    void slot_mnuView_aboutToShow();
    void slot_fontUpdated(QFont font);
    void slot_clipboard();

    void on_actionCut_triggered();
    void on_actionCopy_triggered();
    void on_actionPaste_triggered();
    void on_actionSelect_all_triggered();
    void on_txtText_selectionChanged();
    void on_actionClose_triggered();
    void on_txtText_redoAvailable(bool b);
    void on_txtText_undoAvailable(bool b);
    void on_actionUndo_triggered();
    void on_actionRedo_triggered();
    void on_tbFindNext_clicked();

    void on_tbFindPrev_clicked();

protected:
    void closeEvent(QCloseEvent * e);
private:
    Ui::MNotepad *ui;
    MSbEditWdg _sbwdg;
    MFontChooser _fchooser;
    bool _text_changed;

    QString _filename;
};

#endif // MNOTEPAD_H
