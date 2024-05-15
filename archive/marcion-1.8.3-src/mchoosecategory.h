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


#ifndef MCHOOSECATEGORY_H
#define MCHOOSECATEGORY_H

#include <QDialog>
#include <QTreeWidget>

#include "mlibrarybranches.h"

namespace Ui {
    class MChooseCategory;
}

class MChooseCategory : public QDialog
{
    Q_OBJECT

public:
    explicit MChooseCategory(QWidget *parent = 0);
    ~MChooseCategory();

    QTreeWidget * tree();
    MLibBranchItem * category() const;
private:
    Ui::MChooseCategory *ui;
};

#endif // MCHOOSECATEGORY_H
