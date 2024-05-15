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

#include "mnotepad.h"
#include "ui_mnotepad.h"

MNotepad::MNotepad() :
    QMainWindow(0),
    ui(new Ui::MNotepad),
    _sbwdg(),
    _fchooser(),
    _text_changed(false),
    _filename(QString())
{
    ui->setupUi(this);

    ui->txtText->clear();

    ui->wdgInput->allowChangeScript();
    ui->wdgInput->setSwitch(true);
    ui->wdgInput->setSwitchState(true);

    ui->statusbar->addPermanentWidget(&_sbwdg);

    slot_clipboard();
    on_txtText_selectionChanged();
    on_txtText_textChanged();
    on_txtText_cursorPositionChanged();

    connect(ui->menuView,SIGNAL(aboutToShow()),this,SLOT(slot_mnuView_aboutToShow()));
    connect(&_fchooser,SIGNAL(fontUpdated(QFont)),this,SLOT(slot_fontUpdated(QFont)));
    connect(QApplication::clipboard(),SIGNAL(dataChanged()),this,SLOT(slot_clipboard()));
    connect(ui->wdgInput,SIGNAL(query()),this,SLOT(on_btInsWord_clicked()));

    setWindowTitle(tr("new text file"));
    ui->wdgInsWord->hide();

    _fchooser.setCurrentFont(QApplication::font());
    ui->toolBar->addWidget(&_fchooser);
    ui->toolBar->hide();

    _text_changed=false;

    IC_SIZES
}

MNotepad::~MNotepad()
{
    delete ui;
}

//

bool MNotepad::loadFile(QString const & filename)
{
    if(!filename.isEmpty())
    {
        USE_CLEAN_WAIT

        QFile book(filename);
        if(book.open(QIODevice::ReadOnly))
        {
            QByteArray text=book.readAll();
            book.close();

            _filename=filename;
            ui->txtText->clear();
            setWindowTitle(QFileInfo(_filename).fileName());

            ui->txtText->setPlainText(QString::fromUtf8(text));

            ui->actionSave->setEnabled(false);
            ui->actionReload->setEnabled(false);
            _text_changed=false;

            ui->statusbar->showMessage(tr("file loaded."),5000);

            return true;
        }
        else
            m_msg()->MsgErr(tr("cannot open file '")+filename+tr("' for reading!"));
    }

    return false;
}

void MNotepad::on_actionSave_as_triggered()
{
    QFileDialog fd(this,tr("save text file"),QString(),"text files (*.txt);;all files (*)");
    fd.setFileMode(QFileDialog::AnyFile);
    fd.setAcceptMode(QFileDialog::AcceptSave);
    fd.setConfirmOverwrite(true);
    fd.setDefaultSuffix("txt");
    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
        {
            _filename=fd.selectedFiles().first();
            on_actionSave_triggered();
        }
    }
}

void MNotepad::on_actionSave_triggered()
{
    if(_filename.isEmpty())
        on_actionSave_as_triggered();
    else
    {
        USE_CLEAN_WAIT

        QFile f(_filename);
        if(f.open(QIODevice::WriteOnly))
        {
            int e=f.write(ui->txtText->toPlainText().toUtf8());

            if(e==-1)
                m_msg()->MsgErr(tr("cannot write into file '")+f.fileName()+"'");
            else
            {
                m_msg()->MsgMsg(tr("file '")+f.fileName()+tr("' saved"));

                ui->actionSave->setEnabled(false);
                ui->actionReload->setEnabled(false);
                _text_changed=false;

                setWindowTitle(QFileInfo(_filename).fileName());

                m_msg()->MsgOk();
                ui->statusbar->showMessage(tr("file saved."),5000);
            }
            f.close();
        }
        else
            m_msg()->MsgErr(tr("cannot open file '")+f.fileName()+tr("' for writing"));
    }
}

void MNotepad::on_actionOpen_triggered()
{
    QFileDialog fd(0,tr("edit text file"),"library");

    fd.setAcceptMode(QFileDialog::AcceptOpen);
    fd.setFileMode(QFileDialog::ExistingFiles);
    fd.setWindowIcon(windowIcon());

    QStringList filters;

    filters.append("text (*.txt)");
    filters.append("all (*)");

    fd.setNameFilters(filters);

    if(fd.exec()==QDialog::Accepted)
    {
        if(fd.selectedFiles().count()>0)
            loadFile(fd.selectedFiles().first());
    }
}

void MNotepad::on_actionReload_triggered()
{
    loadFile(_filename);
}

void MNotepad::on_actionInsert_word_triggered(bool checked)
{
    ui->wdgInsWord->setVisible(checked);
}

void MNotepad::on_actionChange_font_triggered(bool checked)
{
    ui->toolBar->setVisible(checked);
}

void MNotepad::slot_mnuView_aboutToShow()
{
    ui->actionInsert_word->setChecked(ui->wdgInsWord->isVisible());
    ui->actionChange_font->setChecked(ui->toolBar->isVisible());
}

void MNotepad::on_txtText_textChanged()
{
    _text_changed=true;
    bool const b=_filename.isEmpty();
    ui->actionSave->setEnabled(!b);
    ui->actionReload->setEnabled(!b);

    _sbwdg.setLinesCount(ui->txtText->document()->lineCount());
    _sbwdg.setCharsCount(ui->txtText->document()->characterCount());
}

void MNotepad::on_txtText_cursorPositionChanged()
{
    _sbwdg.setCursorPos(ui->txtText->textCursor().position());
}

void MNotepad::on_btInsWord_clicked()
{
    ui->txtText->insertPlainText(ui->wdgInput->text_utf8());
}

void MNotepad::slot_fontUpdated(QFont font)
{
    ui->txtText->setFont(font);
}

void MNotepad::slot_clipboard()
{
    bool const b(QApplication::clipboard()->text().isEmpty());

    ui->actionPaste->setEnabled(!b);
}

void MNotepad::on_tbHideWord_clicked()
{
    ui->wdgInsWord->hide();
}

void MNotepad::on_actionCut_triggered()
{
    ui->txtText->cut();
}

void MNotepad::on_actionCopy_triggered()
{
    ui->txtText->copy();
}

void MNotepad::on_actionPaste_triggered()
{
    ui->txtText->paste();
}

void MNotepad::on_actionSelect_all_triggered()
{
    ui->txtText->selectAll();
}

void MNotepad::on_txtText_selectionChanged()
{
    bool const b(ui->txtText->textCursor().hasSelection());

    ui->actionCut->setEnabled(b);
    ui->actionCopy->setEnabled(b);
}

void MNotepad::on_actionClose_triggered()
{
    close();
}

void MNotepad::closeEvent(QCloseEvent * e)
{
    if(_text_changed)
    {
        QMessageBox b(QMessageBox::Warning,tr("close text file"),tr("file has unsaved changes!"),QMessageBox::Cancel|QMessageBox::Discard|QMessageBox::Save,this);
        switch(b.exec())
        {
        case QMessageBox::Save :
            on_actionSave_triggered();
            e->accept();
            break;
        case QMessageBox::Discard :
            e->accept();
            break;
        default:
            e->ignore();
            break;
        }
    }
    else
        e->accept();
}

void MNotepad::on_txtText_redoAvailable(bool b)
{
    ui->actionRedo->setEnabled(b);
}

void MNotepad::on_txtText_undoAvailable(bool b)
{
    ui->actionUndo->setEnabled(b);
}

void MNotepad::on_actionUndo_triggered()
{
    ui->txtText->undo();
}

void MNotepad::on_actionRedo_triggered()
{
    ui->txtText->redo();
}

void MNotepad::on_tbFindNext_clicked()
{
    ui->statusbar->clearMessage();
    if(!ui->txtText->find(ui->wdgInput->text_utf8()))
    {
        ui->statusbar->showMessage(tr("text not found!"),5000);
    }
}

void MNotepad::on_tbFindPrev_clicked()
{
    ui->statusbar->clearMessage();
    if(!ui->txtText->find(ui->wdgInput->text_utf8(),QTextDocument::FindBackward))
    {
        ui->statusbar->showMessage(tr("text not found!"),5000);
    }
}
