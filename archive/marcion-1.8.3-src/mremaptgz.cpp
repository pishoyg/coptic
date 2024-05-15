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

#include "mremaptgz.h"
#include "ui_mremaptgz.h"

MRemapTgz::MRemapTgz(unsigned int id,
                     QString const & path,
                     QString const & title,
                     QWidget *parent) :
    QWidget(parent),
    ui(new Ui::MRemapTgz),
    _id(id),
    _path(QDir::toNativeSeparators(path))
{
    ui->setupUi(this);

    setWindowTitle(tr("remap tarball '")+title+"'");

    ui->treeItems->header()->setResizeMode(QHeaderView::ResizeToContents);
    ui->wdgDir->setRelativeToLibrary(true);
    ui->wdgDir->init(m_msg(),tr("new path"),QDir(_path),false);

    readItems();

    IC_SIZES
}

MRemapTgz::~MRemapTgz()
{
    delete ui;
}

void MRemapTgz::on_btClose_clicked()
{
    close();
}

void MRemapTgz::on_btStart_clicked()
{
    QFileInfo td(ui->wdgDir->targetDir()),path(_path);
    if(QString::compare(td.fileName(),path.fileName(),Qt::CaseSensitive)!=0)
    {
        m_msg()->MsgErr(tr("new path must to reference to the same directory name as previous one! (ie. '")+path.fileName()+"')");
        return;
    }

    QMessageBox mb(QMessageBox::Question,tr("remap tarball"),tr("Path of tarball will be changed to '")+ui->wdgDir->targetDir()+tr("' and paths of all files of related works will be changed also. Continue?"),QMessageBox::Ok|QMessageBox::Cancel,this);
    if(mb.exec()==QMessageBox::Ok)
    {
        QString const newpath(ui->wdgDir->targetDir(true));
        USE_CLEAN_WAIT
        QString query("update `library_data` set `tgz_path`='"+CTranslit::escaped(newpath)+"' where `id`="+QString::number(_id));
        MQUERY(q,query)
        for(int x=0;x<ui->treeItems->topLevelItemCount();x++)
        {
            MArchRemapItem * i((MArchRemapItem *)ui->treeItems->topLevelItem(x));
            QString query2("update `library_archive` set `filename`='"+CTranslit::escaped(i->_newname)+"' where `id`="+QString::number(i->_id));
            MQUERY(q2,query2)
        }
        m_msg()->MsgOk();
        m_msg()->MsgInf(tr("Successfully finished. It is recommended to refresh archive view containing affected items."));
        emit remapped(_id);
        close();
    }
}

void MRemapTgz::readItems()
{
    QString query("select `id`,`work`,`filename` from `library_archive` where `data_id`="+QString::number(_id));

    MQUERY(q,query)

    while(q.next())
    {
        MArchRemapItem * i(new MArchRemapItem());
        i->_id=q.value(0).toUInt();
        i->_work=q.value(1);
        i->_filename=q.value(2);
        i->_filename=QDir::toNativeSeparators(QDir::cleanPath(i->_filename));
        i->_newname=i->_filename;

        i->setText();
        ui->treeItems->addTopLevelItem(i);
    }
    m_msg()->MsgOk();
}

void MRemapTgz::on_treeItems_currentItemChanged(QTreeWidgetItem *current, QTreeWidgetItem *)
{
    MArchRemapItem * item((MArchRemapItem *)current);
    if(item)
    {
        if(QString::compare(item->_filename,item->_newname,Qt::CaseSensitive)!=0)
            ui->lblInfo->setText(tr("remap from '")+item->_filename+tr("' to '")+item->_newname+"'");
        else
            ui->lblInfo->setText(tr("unchanged"));
    }
    else
        ui->lblInfo->clear();
}

void MRemapTgz::on_wdgDir_pathChanged(QString newpath)
{
    QRegExp rmp(QString("^")+QRegExp::escape(_path));
    for(int x=0;x<ui->treeItems->topLevelItemCount();x++)
    {
        MArchRemapItem * i((MArchRemapItem *)ui->treeItems->topLevelItem(x));
        QString nfn(i->_filename);
        nfn.remove(rmp);
        nfn.prepend(newpath+QDir::separator());
        i->_newname=QDir::toNativeSeparators(QDir::cleanPath(nfn));
        i->setText();
    }
    on_treeItems_currentItemChanged(ui->treeItems->currentItem(),0);
}

// MArchRemapItem

MArchRemapItem::MArchRemapItem() :
    QTreeWidgetItem(QTreeWidgetItem::UserType),
    _id(0),
    _work(),
    _filename(),
    _newname()
{

}

void MArchRemapItem::setText()
{
    bool fne(QFile::exists(_filename)),
            fnn(QFile::exists(_newname));
    QTreeWidgetItem::setText(0,_work);
    QTreeWidgetItem::setToolTip(1,_filename);
    if(fne)
    {
        QTreeWidgetItem::setText(1,QObject::tr("yes"));
        QTreeWidgetItem::setIcon(1,QIcon(":/new/icons/icons/greencheck.png"));
    }
    else
    {
        QTreeWidgetItem::setText(1,QObject::tr("no"));
        QTreeWidgetItem::setIcon(1,QIcon(":/new/icons/icons/uncheck.png"));
    }

    QTreeWidgetItem::setToolTip(2,_newname);
    if(fnn)
    {
        QTreeWidgetItem::setText(2,QObject::tr("yes"));
        QTreeWidgetItem::setIcon(2,QIcon(":/new/icons/icons/greencheck.png"));
    }
    else
    {
        QTreeWidgetItem::setText(2,QObject::tr("no"));
        QTreeWidgetItem::setIcon(2,QIcon(":/new/icons/icons/uncheck.png"));
    }
}
