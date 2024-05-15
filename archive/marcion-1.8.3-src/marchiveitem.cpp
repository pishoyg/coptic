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

#include "marchiveitem.h"
#include "ui_marchiveitem.h"

MArchiveItem::MArchiveItem(QString const & work,
                           QString const & author_id,
                           QString const & target,
                           QString const & target2,
                           bool allow_chng_file,
                           QWidget *parent) :
    QDialog(parent),
    ui(new Ui::MArchiveItem),
    _target(target),
    alt_target(target2),
    _alt(false),
    _auth_index(-1)
{
    ui->setupUi(this);

    ui->btFromCurrent->setEnabled(!alt_target.isEmpty());

    ui->wdgFile->setEnabled(allow_chng_file);
    ui->lblMsg->setVisible(!allow_chng_file);
    ui->lblFileName->setText(_target);
    ui->lblFileName->setToolTip(_target);
    testTarget();
    ui->txtWork->setText(work);

    readAuthors(author_id.toUInt(),!author_id.isEmpty());

    adjustSize();
    setMinimumHeight(height());
    setMaximumHeight(height());
}

MArchiveItem::MArchiveItem(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::MArchiveItem),
    _target(),
    alt_target(),
    _alt(false)
{
    ui->setupUi(this);

    ui->wdgNoAuth->setVisible(false);
    setWindowTitle(tr("choose author"));
    readAuthors(0,false);

    adjustSize();
    setMinimumHeight(height());
    setMaximumHeight(height());
}

MArchiveItem::~MArchiveItem()
{
    delete ui;
}

void MArchiveItem::on_btFromCurrent_clicked()
{
    if(!alt_target.isEmpty())
    {
        _alt=true;
        ui->lblFileName->setText(alt_target);
        ui->lblFileName->setToolTip(alt_target);
        testTarget();
    }
}

void MArchiveItem::readAuthors(unsigned int current,bool set_current)
{
    ui->cmbAuthor->clear();
    ui->cmbAuthor->addItem("???",0);

    QString query("select `id`,`author` from `library_author` order by `author`");
    MQUERY(q,query)

    while(q.next())
        ui->cmbAuthor->addItem(q.value(1),q.value(0).toUInt());

    if(set_current)
    {
        int i=ui->cmbAuthor->findData(current);
        if(i!=-1)
            ui->cmbAuthor->setCurrentIndex(_auth_index=i);
        else
            ui->cmbAuthor->setCurrentIndex(_auth_index=0);
    }
    else
        ui->cmbAuthor->setCurrentIndex(_auth_index=0);

    m_msg()->MsgOk();
}

QString MArchiveItem::newWork() const
{
    return ui->txtWork->text();
}

QString MArchiveItem::newTarget() const
{
    return QDir::cleanPath(_alt?alt_target:_target);
}

QString MArchiveItem::newAuthor() const
{
    int ci=ui->cmbAuthor->currentIndex();
    if(ci>0)
        return ui->cmbAuthor->itemData(ci).toString();

    return QString("null");
}

QString MArchiveItem::newAuthorName() const
{
    int ci=ui->cmbAuthor->currentIndex();
    if(ci>0)
        return ui->cmbAuthor->itemText(ci);

    return QString("???");
}

void MArchiveItem::testTarget()
{
    QFileInfo fi(newTarget());
    if(fi.exists())
    {
        if(fi.isDir())
            ui->lblStat->setText(tr("<span style=\"color: green;\">directory!</span>"));
        else if(fi.isSymLink())
            ui->lblStat->setText(tr("<span style=\"color: green;\">symlink!</span>"));
        else
            ui->lblStat->setText(tr("<span style=\"color: blue;\">File exist.</span>"));
    }
    else
        ui->lblStat->setText(tr("<span style=\"color: red;\">File not exist!</span>"));
}

bool MArchiveItem::isAuthorChanged() const
{
    return (_auth_index!=ui->cmbAuthor->currentIndex());
}
